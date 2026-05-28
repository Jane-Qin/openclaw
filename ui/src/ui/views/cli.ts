/**
 * TUI view: pure xterm.js + PTY WebSocket bridge.
 *
 * The browser xterm connects to Gateway's /tui/pty endpoint, which spawns
 * `openclaw chat` via node-pty. All TUI rendering (Markdown, picker, tool
 * cards, slash commands) is handled by the native TUI process — this file
 * only bridges raw bytes between xterm and the PTY WebSocket.
 *
 * Protocol:
 * - xterm.onData → ws.send (keyboard input → PTY stdin)
 * - ws.onmessage → xterm.write (PTY stdout → terminal display)
 * - resize: ws.send(JSON.stringify({type:"resize",cols,rows}))
 */

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export type CliProps = {
  sessionKey: string;
  gatewayUrl: string;
  token: string;
  basePath?: string;
  /** When false, keep PTY alive but pause resize handling (ChatAgent hide/show). */
  active?: boolean;
};

/**
 * Derive the PTY WebSocket URL from the Gateway WS URL.
 * Gateway WS URL is like ws://host:18789 or wss://host/path
 * PTY URL replaces the path with /tui/pty and adds query params.
 */
function buildPtyWsUrl(gatewayUrl: string, sessionKey: string, token: string): string {
  try {
    const gateway = new URL(gatewayUrl, window.location.href);
    const pty = new URL(gateway.origin);
    pty.protocol = gateway.protocol;
    pty.pathname = "/tui/pty";
    pty.search = "";
    pty.hash = "";
    pty.searchParams.set("sessionKey", sessionKey);
    const trimmedToken = token.trim();
    if (trimmedToken) {
      pty.searchParams.set("token", trimmedToken);
    }
    return pty.href;
  } catch {
    const wsBase = gatewayUrl.replace(/\/$/, "");
    return `${wsBase}/../tui/pty?sessionKey=${encodeURIComponent(sessionKey)}&token=${encodeURIComponent(token)}`;
  }
}

/**
 * Track IME composition state with multi-signal detection.
 *
 * Windows Chinese IME has unreliable composition event timing:
 * compositionstart may fire late or not at all relative to keydown/onData.
 * We use two independent signals to detect active composition:
 *
 * 1. composition-view.active class — set by xterm.js CompositionHelper
 *    on compositionstart, cleared on compositionend. This is xterm.js's
 *    own canonical state, but may not be set if compositionstart hasn't
 *    fired yet when the first keystroke reaches onData.
 *
 * 2. input event with insertCompositionText — fires on every composition
 *    keystroke. We set a flag on composition-related input events.
 *
 * On compositionend we clear _composing immediately so that xterm.js's
 * final triggerDataEvent (fired in setTimeout(0) after compositionend)
 * passes through the guard. The composition-view.active class is also
 * cleared by xterm.js on compositionend, so both signals align.
 */
class CompositionGuard {
  private _composing = false;
  private _compositionView: Element | null = null;
  private _textarea: HTMLTextAreaElement | null = null;

  /** Bind DOM listeners on the xterm textarea and composition-view. */
  attach(textarea: HTMLTextAreaElement, compositionView: Element): void {
    this._textarea = textarea;
    this._compositionView = compositionView;

    textarea.addEventListener("compositionstart", this._onCompositionStart);
    textarea.addEventListener("compositionend", this._onCompositionEnd);
    textarea.addEventListener("input", this._onInput);
  }

  /** Remove all DOM listeners. */
  detach(): void {
    this._textarea?.removeEventListener("compositionstart", this._onCompositionStart);
    this._textarea?.removeEventListener("compositionend", this._onCompositionEnd);
    this._textarea?.removeEventListener("input", this._onInput);
  }

  /** Returns true if an IME composition appears to be in progress. */
  isComposing(): boolean {
    if (this._compositionView?.classList.contains("active")) {
      return true;
    }
    if (this._composing) {
      return true;
    }
    return false;
  }

  private _onCompositionStart = (): void => {
    this._composing = true;
  };

  private _onCompositionEnd = (): void => {
    // Clear immediately so the final composed text (sent by xterm.js
    // via triggerDataEvent in setTimeout(0)) passes through the guard.
    this._composing = false;
  };

  private _onInput = (ev: InputEvent): void => {
    if (ev.inputType === "insertCompositionText" || ev.inputType === "deleteCompositionText") {
      this._composing = true;
    } else if (ev.inputType === "insertText") {
      // Final text committed — ensure guard is open
      this._composing = false;
    }
  };
}

@customElement("oc-cli-terminal")
export class OcCliTerminal extends LitElement {
  @property({ type: String }) sessionKey = "";
  @property({ type: String }) gatewayUrl = "";
  @property({ type: String }) token = "";
  @property({ type: String }) basePath = "";
  @property({ type: Boolean }) active = true;

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ws?: WebSocket;
  private resizeObs?: ResizeObserver;
  private cleanupDomListeners?: () => void;
  private onDataDisposable?: { dispose(): void };
  private lastPtyUrl = "";
  private connectScheduled = false;
  private connectAgain = false;
  private connectGeneration = 0;
  private compositionGuard = new CompositionGuard();

  // No shadow DOM — xterm manages its own DOM
  override createRenderRoot() {
    return this;
  }

  override disconnectedCallback() {
    this.cleanup();
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this.initTerm();
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has("active") && this.term) {
      if (this.active) {
        this.resumeVisible();
      }
    }
    if (!this.term) {
      return;
    }
    if (changed.has("sessionKey")) {
      // Skip the initial property bind; initTerm() already schedules the first connect.
      if (changed.get("sessionKey") !== undefined) {
        this.handleSessionKeyChange();
      }
      return;
    }
    if (changed.has("gatewayUrl") || changed.has("token")) {
      this.lastPtyUrl = "";
      this.scheduleConnectPty({ force: true });
    }
  }

  private handleSessionKeyChange() {
    this.closePtyConnection();
    this.lastPtyUrl = "";
    this.connectScheduled = false;
    this.term?.clear();
    this.scheduleConnectPty({ force: true });
  }

  private scheduleConnectPty(opts?: { force?: boolean }) {
    if (this.connectScheduled) {
      if (opts?.force) {
        this.connectAgain = true;
      }
      return;
    }
    this.connectScheduled = true;
    queueMicrotask(() => {
      this.connectScheduled = false;
      if (this.connectAgain) {
        this.connectAgain = false;
        this.scheduleConnectPty(opts);
        return;
      }
      if (!this.term || !this.gatewayUrl || !this.sessionKey || !this.token.trim()) {
        return;
      }
      // Session switch should reconnect even when the TUI pane is hidden.
      if (!opts?.force && !this.active && !this.ws) {
        return;
      }
      this.connectPty();
    });
  }

  private closePtyConnection() {
    this.connectGeneration += 1;
    this.onDataDisposable?.dispose();
    this.onDataDisposable = undefined;
    if (!this.ws) {
      return;
    }
    const ws = this.ws;
    this.ws = undefined;
    try {
      ws.close();
    } catch { /* ignore */ }
  }

  private resumeVisible() {
    queueMicrotask(() => {
      this.fitAddon?.fit();
      this.sendResize();
      this.resetHorizontalScroll();
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.scheduleConnectPty();
      }
    });
  }

  private cleanup() {
    this.resizeObs?.disconnect();
    this.resizeObs = undefined;

    this.cleanupDomListeners?.();
    this.cleanupDomListeners = undefined;

    this.compositionGuard.detach();

    this.onDataDisposable?.dispose();
    this.onDataDisposable = undefined;

    if (this.ws) {
      try {
        this.ws.close();
      } catch { /* ignore */ }
      this.ws = undefined;
    }

    this.term?.dispose();
    this.term = undefined;
    this.fitAddon = undefined;
  }

  private initTerm() {
    const el = this.querySelector("#cli-term");
    if (!el) return;

    const t = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Cascadia Code','Fira Code','JetBrains Mono',Menlo,Monaco,monospace",
      scrollOnUserInput: false,
      theme: {
        background: "#ffffff",
        foreground: "#1d2129",
        cursor: "#165DFF",
        cursorAccent: "#ffffff",
        selectionBackground: "#c7e0ff",
        selectionForeground: "#1d2129",
        black: "#1d2129",
        brightBlack: "#86909c",
        white: "#f2f3f5",
        brightWhite: "#ffffff",
      },
    });

    const fit = new FitAddon();
    t.loadAddon(fit);
    t.open(el as HTMLElement);
    fit.fit();

    const resetHorizontalScroll = () => this.resetHorizontalScroll();
    const resetHorizontalScrollSoon = () => {
      resetHorizontalScroll();
      window.requestAnimationFrame(resetHorizontalScroll);
    };
    const termElement = t.element;
    this.addEventListener("scroll", resetHorizontalScrollSoon, { passive: true });
    el.addEventListener("scroll", resetHorizontalScrollSoon, { passive: true });
    termElement?.addEventListener("scroll", resetHorizontalScrollSoon, { passive: true });
    window.addEventListener("scroll", resetHorizontalScrollSoon, { passive: true });

    const textarea = this.querySelector(".xterm-helper-textarea") as HTMLTextAreaElement | null;
    const compositionView = this.querySelector(".composition-view") as HTMLElement | null;
    if (textarea && compositionView) {
      this.compositionGuard.attach(textarea, compositionView);
    }

    // Force composition-view to the cursor position.
    // xterm.js's CompositionHelper often miscalculates the position on Windows,
    // placing it at the far right. We override it using the terminal's cursor
    // coordinates and cell dimensions derived from the actual DOM.
    const repositionCompositionView = () => {
      if (!compositionView || !this.term) return;
      const buf = this.term.buffer?.active;
      if (!buf) return;

      const xtermEl = this.querySelector(".xterm-screen") as HTMLElement | null;
      if (!xtermEl) return;

      const rows = this.term.rows || 1;
      const cols = this.term.cols || 1;
      const cellWidth = xtermEl.clientWidth / cols;
      const cellHeight = xtermEl.clientHeight / rows;

      const cursorX = buf.cursorX ?? 0;
      const cursorY = buf.cursorY ?? 0;

      compositionView.style.left = `${Math.round(cursorX * cellWidth)}px`;
      compositionView.style.top = `${Math.round(cursorY * cellHeight)}px`;

      resetHorizontalScroll();
    };

    const onCompositionUpdate = () => {
      repositionCompositionView();
      window.requestAnimationFrame(repositionCompositionView);
    };
    const onCompositionEnd = () => {
      resetHorizontalScroll();
      window.requestAnimationFrame(resetHorizontalScroll);
    };
    textarea?.addEventListener("compositionstart", onCompositionUpdate);
    textarea?.addEventListener("compositionupdate", onCompositionUpdate);
    textarea?.addEventListener("compositionend", onCompositionEnd);

    this.cleanupDomListeners = () => {
      this.removeEventListener("scroll", resetHorizontalScrollSoon);
      el.removeEventListener("scroll", resetHorizontalScrollSoon);
      termElement?.removeEventListener("scroll", resetHorizontalScrollSoon);
      window.removeEventListener("scroll", resetHorizontalScrollSoon);
      textarea?.removeEventListener("compositionstart", onCompositionUpdate);
      textarea?.removeEventListener("compositionupdate", onCompositionUpdate);
      textarea?.removeEventListener("compositionend", onCompositionEnd);
    };

    this.resizeObs = new ResizeObserver(() => {
      if (!this.active) {
        return;
      }
      fit.fit();
      this.sendResize();
      this.resetHorizontalScroll();
    });
    this.resizeObs.observe(el as HTMLElement);

    this.term = t;
    this.fitAddon = fit;

    if (this.gatewayUrl && this.sessionKey) {
      if (!this.token.trim()) {
        t.writeln("\r\n\x1b[31m● Gateway credentials required for TUI mode\x1b[0m\r\n");
        return;
      }
      if (this.active) {
        this.scheduleConnectPty();
      }
    }
  }

  private connectPty() {
    if (!this.gatewayUrl || !this.sessionKey || !this.token.trim()) {
      return;
    }

    const ptyUrl = buildPtyWsUrl(this.gatewayUrl, this.sessionKey, this.token);
    if (ptyUrl === this.lastPtyUrl && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.lastPtyUrl = ptyUrl;
    this.closePtyConnection();

    const generation = this.connectGeneration;
    const ws = new WebSocket(ptyUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (generation !== this.connectGeneration || ws !== this.ws) {
        return;
      }
      if (this.active) {
        this.term?.write("\x1b[32m● PTY connected\x1b[0m\r\n");
        this.sendResize();
        this.resetHorizontalScroll();
      }
    };

    ws.onmessage = (evt) => {
      if (generation !== this.connectGeneration || ws !== this.ws) {
        return;
      }
      const data = typeof evt.data === "string" ? evt.data : "";
      if (data && this.term) {
        this.term.write(data);
      }
    };

    ws.onclose = () => {
      if (generation !== this.connectGeneration || ws !== this.ws) {
        return;
      }
      this.ws = undefined;
      this.term?.write("\r\n\x1b[31m● PTY disconnected\x1b[0m\r\n");
    };

    ws.onerror = () => {
      if (generation !== this.connectGeneration || ws !== this.ws) {
        return;
      }
      this.term?.write("\r\n\x1b[31m● PTY connection error\x1b[0m\r\n");
    };

    this.onDataDisposable = this.term?.onData((data) => {
      if (this.compositionGuard.isComposing()) {
        return;
      }
      if (ws.readyState === WebSocket.OPEN && ws === this.ws) {
        ws.send(data);
      }
    });
  }

  private sendResize() {
    if (!this.fitAddon || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const { cols, rows } = this.fitAddon.proposeDimensions() ?? { cols: 120, rows: 30 };
    this.ws.send(JSON.stringify({ type: "resize", cols, rows }));
  }

  private resetHorizontalScroll() {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    this.scrollLeft = 0;

    const scrollableNodes = [
      this.querySelector("#cli-term"),
      this.querySelector(".xterm"),
      this.querySelector(".xterm-screen"),
      this.querySelector(".xterm-viewport"),
      this.closest(".chatagent-pane"),
      this.closest(".chatagent-body"),
      this.closest(".chatagent-main"),
      this.closest(".shell--chatagent"),
    ];
    for (const node of scrollableNodes) {
      if (node instanceof HTMLElement) {
        node.scrollLeft = 0;
      }
    }
  }

  override render() {
    return html`<div id="cli-term" class="cli-terminal__xterm"></div>`;
  }
}

export function renderCli(props: CliProps) {
  return html`
    <oc-cli-terminal
      class="cli"
      .sessionKey=${props.sessionKey}
      .gatewayUrl=${props.gatewayUrl}
      .token=${props.token}
      .basePath=${props.basePath ?? ""}
      .active=${props.active ?? true}
      style="display:block;height:100%;width:100%"
    ></oc-cli-terminal>
  `;
}
