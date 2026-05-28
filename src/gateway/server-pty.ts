/**
 * PTY Bridge for TUI mode.
 *
 * Spawns `openclaw chat` as a child PTY process and bridges its stdin/stdout
 * to a browser WebSocket connection. The browser xterm sends raw keystrokes
 * and receives ANSI output — all TUI rendering logic lives in the spawned
 * `openclaw chat` process.
 *
 * Protocol (WS ↔ PTY):
 * - Binary/text frames from browser → pty.write() (raw keystrokes)
 * - pty.onData → ws.send() (ANSI output)
 * - JSON resize: { type: "resize", cols: number, rows: number } → pty.resize()
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { WebSocket, WebSocketServer } from "ws";
import { getRuntimeConfig } from "../config/io.js";
import type { GatewayAuthResult, ResolvedGatewayAuth } from "./auth.js";
import {
  authorizeHttpGatewayConnectWithDeviceFallback,
  resolveHttpBrowserOriginPolicy,
} from "./http-auth-utils.js";
import { resolveGatewayBindHost } from "./net.js";

// ---------------------------------------------------------------------------
// PTY module loading (lazy, same pattern as src/process/supervisor/adapters/pty.ts)
// ---------------------------------------------------------------------------

type PtyExitEvent = { exitCode: number; signal?: number };
type PtyDisposable = { dispose: () => void };
type PtySpawnHandle = {
  pid: number;
  readonly cols: number;
  readonly rows: number;
  write: (data: string | Buffer) => void;
  onData: (listener: (value: string) => void) => PtyDisposable | void;
  onExit: (listener: (event: PtyExitEvent) => void) => PtyDisposable | void;
  kill: (signal?: string) => void;
  resize: (columns: number, rows: number) => void;
};
type PtySpawn = (
  file: string,
  args: string[] | string,
  options: {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string>;
  },
) => PtySpawnHandle;
type PtyModule = { spawn?: PtySpawn; default?: { spawn?: PtySpawn } };

let ptyModulePromise: Promise<PtyModule> | null = null;

async function loadPtyModule(): Promise<PtyModule> {
  ptyModulePromise ??= import("@lydell/node-pty") as Promise<unknown> as Promise<PtyModule>;
  return ptyModulePromise;
}

// ---------------------------------------------------------------------------
// Resolve openclaw CLI entry point for PTY spawn
// ---------------------------------------------------------------------------

function resolveOpenclawChatCommand(): { command: string; args: string[] } {
  // Probe candidates in priority order; first one that exists wins.
  // import.meta.url in a rolldown bundle points at dist/server.impl-xxx.js,
  // so relative URLs resolve relative to that file's directory.
  const candidates = [
    // import.meta.url resolves to dist/server.impl-xxx.js in rolldown output;
    // one level up (../) reaches the project root where openclaw.mjs lives.
    fileURLToPath(new URL("../openclaw.mjs", import.meta.url)),
    // Same origin: dist/server.impl-xxx.js → ../ → dist/entry.js
    fileURLToPath(new URL("../dist/entry.js", import.meta.url)),
  ];
  for (const resolved of candidates) {
    if (existsSync(resolved)) {
      return { command: process.execPath, args: [resolved] };
    }
  }
  // Last resort: assume `openclaw` is on PATH (global install)
  return { command: "openclaw", args: [] };
}

// ---------------------------------------------------------------------------
// Concurrency limit
// ---------------------------------------------------------------------------

const MAX_PTY_SESSIONS = 10;
let activePtyCount = 0;

// ---------------------------------------------------------------------------
// PTY session: bridge WS ↔ PTY
// ---------------------------------------------------------------------------

function startPtySession(params: {
  ws: WebSocket;
  sessionKey: string;
  gatewayToken?: string;
  gatewayPassword?: string;
  gatewayUrl: string;
  cols: number;
  rows: number;
  log?: { warn: (msg: string) => void };
}): void {
  const { ws, sessionKey, gatewayToken, gatewayPassword, gatewayUrl, cols, rows, log } = params;

  // Build openclaw tui args (use canonical "tui" subcommand, not "chat" alias,
  // because "chat"/"terminal" aliases auto-enable --local which conflicts with --url/--token)
  const { command, args: baseArgs } = resolveOpenclawChatCommand();
  const chatArgs = [
    ...baseArgs,
    "tui",
    "--url",
    gatewayUrl,
    "--session",
    sessionKey,
    "--no-header",
  ];
  if (gatewayToken) {
    chatArgs.push("--token", gatewayToken);
  }
  if (gatewayPassword) {
    chatArgs.push("--password", gatewayPassword);
  }

  // Lazy-load PTY and spawn
  let pty: PtySpawnHandle | null = null;
  let dataDisposable: PtyDisposable | null = null;
  let exitDisposable: PtyDisposable | null = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    try {
      dataDisposable?.dispose();
    } catch { /* ignore */ }
    try {
      exitDisposable?.dispose();
    } catch { /* ignore */ }
    dataDisposable = null;
    exitDisposable = null;

    if (pty) {
      try {
        pty.kill();
      } catch { /* ignore */ }
      pty = null;
    }

    activePtyCount = Math.max(0, activePtyCount - 1);

    if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
      try {
        ws.close();
      } catch { /* ignore */ }
    }
  };

  // Handle WS close from browser side
  ws.on("close", () => {
    cleanup();
  });

  ws.on("error", (err) => {
    log?.warn(`pty: ws error for session ${sessionKey}: ${String(err)}`);
    cleanup();
  });

  // Handle incoming data from browser (keystrokes or resize JSON)
  ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
    if (!pty) return;

    // Try to parse as JSON resize message
    if (!isBinary && typeof raw !== "undefined") {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
      if (text.startsWith("{")) {
        try {
          const msg = JSON.parse(text);
          if (msg.type === "resize" && typeof msg.cols === "number" && typeof msg.rows === "number") {
            pty.resize(msg.cols, msg.rows);
            return;
          }
        } catch { /* not JSON, treat as raw input */ }
      }
    }

    // Raw keystroke data
    const data = typeof raw === "string"
      ? raw
      : Buffer.isBuffer(raw)
        ? raw
        : Array.isArray(raw)
          ? Buffer.concat(raw)
          : Buffer.from(raw as ArrayBuffer);
    pty.write(data);
  });

  // Spawn PTY process (async — load module first)
  void (async () => {
    try {
      const mod = await loadPtyModule();
      const spawn = mod.spawn ?? mod.default?.spawn;
      if (!spawn) {
        ws.send(JSON.stringify({ type: "error", message: "PTY support unavailable" }));
        cleanup();
        return;
      }

      const env = { ...process.env, OPENCLAW_HIDE_BANNER: "1" } as Record<string, string>;

      pty = spawn(command, chatArgs, {
        cols,
        rows,
        cwd: process.cwd(),
        env,
        name: "xterm-256color",
      });

      activePtyCount++;

      // PTY stdout → WS
      dataDisposable = pty.onData((data: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      }) ?? null;

      // PTY exit → cleanup
      exitDisposable = pty.onExit((event: PtyExitEvent) => {
        log?.warn(
          `pty: openclaw chat exited for session ${sessionKey} (code=${event.exitCode}, signal=${event.signal})`,
        );
        cleanup();
      }) ?? null;
    } catch (err) {
      log?.warn(`pty: failed to spawn for session ${sessionKey}: ${String(err)}`);
      ws.send(JSON.stringify({ type: "error", message: `PTY spawn failed: ${String(err)}` }));
      cleanup();
    }
  })();
}

// ---------------------------------------------------------------------------
// Query parameter helpers
// ---------------------------------------------------------------------------

function getQueryParam(req: IncomingMessage, name: string): string | undefined {
  const url = req.url ?? "";
  const queryStart = url.indexOf("?");
  if (queryStart < 0) return undefined;
  const search = url.slice(queryStart + 1);
  for (const pair of search.split("&")) {
    const eq = pair.indexOf("=");
    if (eq >= 0 && decodeURIComponent(pair.slice(0, eq)) === name) {
      return decodeURIComponent(pair.slice(eq + 1));
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Exported handler: called from attachGatewayUpgradeHandler when path is /tui/pty
// ---------------------------------------------------------------------------

export async function handlePtyUpgrade(params: {
  req: IncomingMessage;
  socket: Duplex;
  head: Buffer;
  wss: WebSocketServer;
  resolvedAuth: ResolvedGatewayAuth;
  log?: { warn: (msg: string) => void };
}): Promise<boolean> {
  const { req, socket, head, wss, resolvedAuth, log } = params;
  const requestPath = (req.url ?? "/").split("?")[0];

  // Only handle /tui/pty
  if (requestPath !== "/tui/pty") {
    return false;
  }

  // Concurrency check
  if (activePtyCount >= MAX_PTY_SESSIONS) {
    socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return true;
  }

  // Auth: validate gateway token/password from query params or Authorization header
  const cfg = getRuntimeConfig();
  const trustedProxies = cfg.gateway?.trustedProxies ?? [];
  const allowRealIpFallback = cfg.gateway?.allowRealIpFallback === true;

  const token = getQueryParam(req, "token");
  const browserOriginPolicy = resolveHttpBrowserOriginPolicy(req);

  const authResult: GatewayAuthResult = await authorizeHttpGatewayConnectWithDeviceFallback({
    auth: resolvedAuth,
    token,
    req,
    trustedProxies,
    allowRealIpFallback,
    browserOriginPolicy,
  });

  if (!authResult.ok) {
    if (authResult.rateLimited) {
      const retryAfter = authResult.retryAfterMs && authResult.retryAfterMs > 0
        ? Math.ceil(authResult.retryAfterMs / 1000)
        : undefined;
      socket.write(
        [
          "HTTP/1.1 429 Too Many Requests",
          retryAfter ? `Retry-After: ${retryAfter}` : undefined,
          "Connection: close",
          "",
        ].filter(Boolean).join("\r\n") + "\r\n",
      );
    } else {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    }
    socket.destroy();
    return true;
  }

  // Extract session key
  const sessionKey = getQueryParam(req, "sessionKey") ?? "agent:main:main";
  const cols = Math.max(1, Number(getQueryParam(req, "cols") ?? "120"));
  const rows = Math.max(1, Number(getQueryParam(req, "rows") ?? "30"));

  // Resolve gateway URL for openclaw tui subprocess to connect to.
  // cfg.gateway.bind may be a symbolic name like "loopback" — resolve it
  // to an actual IP address via resolveGatewayBindHost (e.g. "loopback" → "127.0.0.1").
  const bindHost = await resolveGatewayBindHost(cfg.gateway?.bind);
  const port = cfg.gateway?.port ?? 18789;
  const protocol = cfg.gateway?.tls?.enabled ? "wss" : "ws";
  const gatewayUrl = `${protocol}://${bindHost}:${port}`;

  // Upgrade to WebSocket, then start PTY session
  return new Promise<boolean>((resolve) => {
    try {
      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        // Browser PTY auth may use a paired device token; the spawned `openclaw tui`
        // subprocess must use the gateway's own shared secret, not that device token.
        startPtySession({
          ws,
          sessionKey,
          gatewayToken: resolvedAuth.mode === "token" ? resolvedAuth.token : undefined,
          gatewayPassword: resolvedAuth.mode === "password" ? resolvedAuth.password : undefined,
          gatewayUrl,
          cols,
          rows,
          log,
        });
        resolve(true);
      });
    } catch (err) {
      log?.warn(`pty: ws upgrade failed for session ${sessionKey}: ${String(err)}`);
      socket.destroy();
      resolve(true);
    }
  });
}
