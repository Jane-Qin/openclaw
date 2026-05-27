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

@customElement("oc-cli-terminal")
export class OcCliTerminal extends LitElement {
  @property({ type: String }) sessionKey = "";
  @property({ type: String }) gatewayUrl = "";
  @property({ type: String }) token = "";
  @property({ type: String }) basePath = "";

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ws?: WebSocket;
  private resizeObs?: ResizeObserver;
  private onDataDisposable?: { dispose(): void };
  private lastPtyUrl = "";
  private connectScheduled = false;

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
    if (
      (changed.has("gatewayUrl") || changed.has("token") || changed.has("sessionKey")) &&
      this.term
    ) {
      this.scheduleConnectPty();
    }
  }

  private scheduleConnectPty() {
    if (this.connectScheduled) {
      return;
    }
    this.connectScheduled = true;
    queueMicrotask(() => {
      this.connectScheduled = false;
      if (!this.term || !this.gatewayUrl || !this.sessionKey || !this.token.trim()) {
        return;
      }
      this.connectPty();
    });
  }

  private cleanup() {
    this.resizeObs?.disconnect();
    this.resizeObs = undefined;

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
      theme: {
        background: "#1a1a2e",
        foreground: "#e0e0e0",
        cursor: "#4ec9b0",
        selectionBackground: "#264f78",
      },
    });

    const fit = new FitAddon();
    t.loadAddon(fit);
    t.open(el as HTMLElement);
    fit.fit();

    t.writeln("\x1b[1mDataWorks Agent — TUI\x1b[0m");
    t.writeln("Connecting to PTY bridge...\r\n");

    this.resizeObs = new ResizeObserver(() => {
      fit.fit();
      this.sendResize();
    });
    this.resizeObs.observe(el as HTMLElement);

    this.term = t;
    this.fitAddon = fit;

    if (this.gatewayUrl && this.sessionKey) {
      if (!this.token.trim()) {
        t.writeln("\r\n\x1b[31m● Gateway credentials required for TUI mode\x1b[0m\r\n");
        return;
      }
      this.scheduleConnectPty();
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
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    this.lastPtyUrl = ptyUrl;

    // Close existing connection
    if (this.ws) {
      try {
        this.ws.close();
      } catch { /* ignore */ }
      this.ws = undefined;
    }

    const ws = new WebSocket(ptyUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.term?.write("\x1b[32m● PTY connected\x1b[0m\r\n");
      // Send initial resize
      this.sendResize();
    };

    ws.onmessage = (evt) => {
      // PTY output → xterm display
      const data = typeof evt.data === "string" ? evt.data : "";
      if (data && this.term) {
        this.term.write(data);
      }
    };

    ws.onclose = () => {
      this.term?.write("\r\n\x1b[31m● PTY disconnected\x1b[0m\r\n");
    };

    ws.onerror = () => {
      this.term?.write("\r\n\x1b[31m● PTY connection error\x1b[0m\r\n");
    };

    // xterm keyboard input → PTY stdin
    this.onDataDisposable?.dispose();
    this.onDataDisposable = this.term?.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  private sendResize() {
    if (!this.fitAddon || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const { cols, rows } = this.fitAddon.proposeDimensions() ?? { cols: 120, rows: 30 };
    this.ws.send(JSON.stringify({ type: "resize", cols, rows }));
  }

  override render() {
    return html`<div
      id="cli-term"
      style="height:100%;width:100%;background:#1a1a2e"
    ></div>`;
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
      style="display:block;height:100%;width:100%"
    ></oc-cli-terminal>
  `;
}
