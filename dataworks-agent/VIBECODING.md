# AI Vibecoding 上下文地图

> 给 AI Coding Agent（Cursor / Claude Code / Codex 等）准备的上下文文档。
> 开发前**先读这份**，再开始改代码，能显著降低翻车率。

---

## 1. 项目总览（一句话）

OpenClaw 是 TypeScript + pnpm monorepo，前端 UI 在 `ui/`（Vite + Lit Web Components），
后端 Gateway 与 Agent 运行时在 `src/`。我们的改动涉及 **`ui/`**（前端 TUI 视图）、
**`src/gateway/`**（后端 PTY Bridge）与 **`dataworks-agent/`**（文档）三个目录。

---

## 2. 项目代码地图（前端 UI 重点）

### 2.1 顶层目录

| 路径 | 用途 | 改不改 |
|------|------|--------|
| `ui/` | 浏览器 Control UI（Vite + Lit），**前端主战场** | ✅ 要改 |
| `src/` | Gateway 与 agent 运行时（TS） | ✅ **要改**（PTY Bridge） |
| `src/tui/` | 命令行 TUI（PTY spawn 的目标进程） | 📖 参考 |
| `src/gateway/` | Gateway 服务器（加 PTY WS 端点） | ✅ **要改** |
| `packages/` | 内部子包（如 `@openclaw/sdk`） | ❌ 不改 |
| `apps/` | 子应用（如 macOS app） | ❌ 不改 |
| `docs/` | OpenClaw 自带文档 | ❌ MVP 不改（非本项目的交付范围） |
| `dataworks-agent/` | **我们的工作目录** | ✅ 新增 |

### 2.2 `ui/src/ui/` 关键文件（实际存在，已校验）

#### 应用入口 & 路由
| 文件 | 用途 |
|------|------|
| `app.ts` | 顶层 Lit 应用组件 |
| `app-render.ts` | 主渲染逻辑 |
| `app-view-state.ts` | 视图状态管理 |
| **`navigation.ts`** | **路由 / 导航定义** — 新增 CLI tab 的地方 |

#### 会话 & Gateway 客户端
| 文件 | 用途 |
|------|------|
| **`app-gateway.ts`** | **Gateway WebSocket 客户端** — Chat 连接时 `client.mode = "webchat"`；TUI 视图不共用此连接，而是通过独立 PTY WS 连到 Gateway |
| `app-chat.ts` | Chat 视图业务逻辑（应用层） |
| `gateway.ts` | 底层 Gateway 连接 |
| `session-key.ts` / `session-display.ts` | sessionKey 处理 |

#### Chat 视图（参考实现）
| 文件 | 用途 |
|------|------|
| **`views/chat.ts`** | **Chat 主视图** — TUI 视图不需要照葫芦画瓢（PTY 方案下 xterm 只做终端仿真） |
| `chat/chat-welcome.ts` | 欢迎页（DataWorks 截图里的 hero 区域） |
| `chat/session-controls.ts` | Chat header 控件（模型选择等，**视图切换 Toggle 放这里**） |
| `chat/slash-commands.ts` | 斜杠命令定义（`/help` `/model` 等） |
| `chat/slash-command-executor.ts` | 斜杠命令执行 |
| `chat/tool-cards.ts` | 工具调用卡片 |
| `chat/build-chat-items.ts` | 消息列表渲染 |
| `chat/run-controls.ts` | 发送/停止控件 |

#### Controllers（业务逻辑层）
| 文件 | 用途 |
|------|------|
| `controllers/chat.ts` | Chat controller |
| `controllers/sessions.ts` | 会话列表 controller |
| `controllers/agents.ts` | Agent 管理 controller |
| `controllers/models.ts` | 模型列表 controller |

#### 其他可能要碰
| 文件 | 用途 |
|------|------|
| `views/agents.ts` | Agent 管理 view（P1 智能体下拉参考） |
| `views/sessions.ts` | 会话管理 view |
| `views/command-palette.ts` | 命令面板（Ctrl+L 等 picker） |
| `theme.ts` / `custom-theme.ts` | 主题（视觉改造时碰） |

### 2.3 `src/tui/` 参考（PTY spawn 的目标进程）

| 文件 | 用途 |
|------|------|
| `tui.ts` | TUI 主入口（`runTui()`）—— PTY 将 spawn `openclaw chat` 运行此代码 |
| `gateway-chat.ts` | TUI → Gateway 连接（`GatewayClient`，`mode: "ui"`，`clientName: "openclaw-tui"`） |
| `tui-event-handlers.ts` | 事件处理（chat delta/final/error/aborted） |
| `tui-command-handlers.ts` | 斜杠命令处理（`/help` `/model` `/agent` 等） |
| `tui-formatters.ts` | 终端输出格式化（ANSI 颜色、Markdown、工具卡片） |
| `embedded-backend.ts` | 嵌入式（`--local`）后端 |
| `components/chat-log.ts` | 终端聊天日志渲染 |

📖 **重点参考**：`src/tui/tui.ts` 看 TUI 如何初始化（`new TUI(new ProcessTerminal())`）、
`src/tui/gateway-chat.ts` 看 TUI 如何连 Gateway。
TUI 子进程是独立客户端（`mode: "ui"`），与 Chat 视图的 `GatewayBrowserClient`（`mode: "webchat"`）不共享连接，
但通过 `--session` 参数共享同一 sessionKey。

### 2.4 `src/gateway/` PTY Bridge 要碰的文件

| 文件 | 用途 |
|------|------|
| **`server-pty.ts`** | **新建** — PTY bridge 模块：spawn `openclaw chat`，桥接 WS ↔ PTY |
| `server-http.ts` | HTTP upgrade handler — 需加 `/tui/pty` 路径分支 |
| `server-runtime-state.ts` | Gateway 启动配置 — PTY handler 注册 |
| `server/ws-connection.ts` | 现有 WS 连接处理（参考，不直接改） |

**路由事实（勿写错）：** Chat tab 路径为 **`/chat`**（`navigation.ts` 的 `TAB_PATHS.chat`），不是 `/`。

---

## 3. 每个 P0 任务要碰的文件清单

> 配合 [`PLAN.md`](./PLAN.md) 的 T0-T6 看。

### T2 Control UI 跑通 — 不改文件，只跑构建
```
pnpm install
pnpm ui:build
# 或开发模式
pnpm ui:dev
```

### T3 加 TUI 视图 — **核心改造（前端 + 后端）**

#### T3-A 后端 PTY Bridge

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/gateway/server-pty.ts` | **新建** | PTY bridge：`node-pty.spawn("node", ["dist/cli.js", "chat", ...])`，WS ↔ PTY 桥接 |
| `src/gateway/server-http.ts` | **修改** | upgrade handler 加 `/tui/pty` 路径分支 |
| `package.json` | **修改** | 加 `node-pty` 依赖 |

#### T3-B 前端 TUI 视图

| 文件 | 操作 | 说明 |
|------|------|------|
| `ui/src/ui/views/cli.ts` | **重写** | 纯 xterm + PTY WS 桥接（xterm.onData → ws.send，ws.onmessage → xterm.write） |
| `ui/src/ui/navigation.ts` | **已改** | 注册 `/cli` tab — ✅ 已完成 |
| `ui/src/ui/app-render.ts` | **已改** | TUI 视图渲染分支 — ✅ 已完成 |
| `ui/package.json` | **已改** | 加依赖 `xterm` `xterm-addon-fit` — ✅ 已完成 |

### T4 Chat/TUI Toggle

| 文件 | 操作 | 说明 |
|------|------|------|
| `ui/src/ui/chat/session-controls.ts` | **修改** | 在 chat header 加 segmented toggle "Chat / TUI" |
| `ui/src/ui/navigation.ts` | **已改** | toggle 在 **`/chat` ⇄ `/cli`** 间切换 |
| `ui/src/ui/app-view-state.ts` | **可能修改** | 保证切换时 sessionKey 在 URL 参数里持续 |

### T5 iframe 嵌入

| 配置 | 操作 |
|------|------|
| `~/.openclaw/openclaw.json` | 加 `gateway.controlUi.basePath: "/openclaw"` |
| 同上 | 加 `gateway.controlUi.allowedOrigins: [宿主域名]` |
| 宿主数据中台 Nginx | 加反代 `/openclaw/* → gateway:18789/*` |

---

## 4. Lit Web Components 速成（不熟的话先看）

OpenClaw UI 用 [Lit](https://lit.dev/)，**不是 React**。基本约定：

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("openclaw-cli-view")
export class OpenclawCliView extends LitElement {
  // 父组件传进来的属性
  @property({ type: String }) sessionKey = "";

  // 内部状态
  @state() private connected = false;

  // 样式（Shadow DOM 隔离）
  static styles = css`
    :host { display: block; height: 100%; }
    .terminal { background: #000; color: #fff; padding: 1rem; }
  `;

  // 生命周期：挂载后初始化 xterm
  connectedCallback() {
    super.connectedCallback();
    this.initXterm();
  }

  // 模板
  render() {
    return html`
      <div class="terminal" id="xterm-mount"></div>
      ${this.connected ? html`<span>connected</span>` : html`<span>connecting…</span>`}
    `;
  }

  private async initXterm() {
    // ... 见 T3 实现细节
  }
}
```

要点：
- 组件用 `@customElement("xxx-yyy")` 注册成自定义元素
- 模板用 `html` tagged template
- 状态变更后**自动重渲染**（与 React 类似）
- Shadow DOM 隔离样式，全局 CSS 不会污染

---

## 5. 给 AI 的提示词模板

### 模板 A：让 AI 先读上下文（**每次开新会话先发**）

```
我在做 OpenClaw 的二次开发，目标是在我们的数据中台浏览器端嵌入一个
基于 OpenClaw 的 AI 助手页面（Chat + TUI 双视图）。TUI 模式采用 xterm.js + PTY 桥接方案，
在浏览器中嵌入原生 `openclaw chat` 终端界面。

先读以下文档建立上下文：
1. dataworks-agent/PLAN.md（开发计划与决策记录）
2. dataworks-agent/VIBECODING.md（本文档，代码地图）
3. src/gateway/server-http.ts（Gateway WS upgrade handler，加 PTY 路径的地方）
4. src/tui/tui.ts（原生 TUI 入口，PTY spawn 的目标进程）
5. ui/src/ui/views/cli.ts（前端 TUI 视图，xterm + WS 桥接）

读完简要总结你理解的项目结构与我接下来要做的事，再开始任何修改。
```

### 模板 B：T3-A 后端 PTY Bridge

```
基于 dataworks-agent/PLAN.md 的 T3-A 任务，在 src/gateway/ 下新建 PTY Bridge。

要求：
1. 新建 src/gateway/server-pty.ts：
   - 导出 handlePtyUpgrade() 函数
   - 用 node-pty.spawn() 启动 "node dist/cli.js chat --url <gatewayUrl> --token <token> --session <sessionKey>"
   - PTY stdout → WS 发送给浏览器
   - WS 收到浏览器数据 → PTY stdin 写入
   - WS 收到 resize 消息 → pty.resize(cols, rows)
   - WS 关闭 / PTY 退出时清理资源
2. 修改 src/gateway/server-http.ts：
   - 在 attachGatewayUpgradeHandler 中加 /tui/pty 路径判断
   - 鉴权（复用 Gateway token）后转交 PTY handler
3. 并发限制：同时最多 N 个 PTY 进程

不要：
- 不要 spawn /bin/bash 或任意 shell（只 spawn openclaw chat）
- 不要绕过鉴权
- 不要修改 src/tui/ 下的 TUI 代码

参考：
- src/gateway/server-http.ts:815 看 upgrade handler 结构
- src/tui/tui.ts 看 openclaw chat 的启动参数（--url, --token, --session）

完成后告诉我：动了哪些文件、每个文件做了什么、还要做什么测试。
```

### 模板 B2：T3-B 前端 TUI 视图

```
基于 dataworks-agent/PLAN.md 的 T3-B 任务，重写 ui/src/ui/views/cli.ts。

要求：
1. xterm.js 初始化 + FitAddon（xterm 和 xterm-addon-fit 已安装）
2. 连接 ws://gateway:18789/tui/pty（从 host settings 读 gatewayUrl 拼接）
3. xterm.onData → ws.send（键盘输入发往 PTY）
4. ws.onmessage → xterm.write（PTY 输出写入 xterm）
5. 浏览器 resize → xterm resize → ws.send(JSON.stringify({type:"resize",cols,rows}))
6. 无 Shadow DOM（createRenderRoot() { return this; }）

不要：
- 不要自己做 chat.send 或消息渲染（PTY 子进程负责所有 UI 逻辑）
- 不要处理 /help 等斜杠命令（原生 TUI 已处理）
- 不要加 Markdown 渲染或工具卡片（原生 TUI 通过 ANSI 输出）

参考：
- ui/src/ui/views/chat.ts 看 view 导出模式（renderCli 函数）
- ui/src/ui/navigation.ts 看 cli tab 已注册
```

### 模板 C：T4 加视图切换 Toggle

```
基于 dataworks-agent/PLAN.md 的 T4 任务，在 Chat header 区域加一个
"Chat / TUI" segmented toggle，点击后路由切换且保持 sessionKey。

要求：
1. 在 ui/src/ui/chat/session-controls.ts 加 toggle 控件
2. 点击 toggle 触发路由切换（/chat 或 /cli），URL 保持 ?sessionKey=xxx
3. 切到 TUI 时用当前 sessionKey spawn PTY 进程（--session 参数）

样式参考 OpenClaw 现有 segmented control 风格，不要新引入 UI 库。
```

### 模板 D：调试问题

```
我在改 ui/src/ui/views/cli.ts，遇到 [描述具体错误]。

请：
1. 先读相关文件找原因，不要直接改
2. 如果是 Lit 组件生命周期问题，参考 ui/src/ui/views/chat.ts 的处理
3. 如果是 Gateway WebSocket 协议问题，参考 ui/src/ui/app-gateway.ts 与 src/tui/tui-backend.ts
4. 给出根因 + 修复方案，等我确认后再改
```

---

## 6. 调试技巧

### 6.1 开发模式

```bash
# 1. 起 Gateway（一个终端）
pnpm openclaw gateway --bind 127.0.0.1 --port 18789

# 2. 起 UI dev server（另一个终端）
pnpm ui:dev

# 3. 浏览器打开
# http://localhost:5173/?gatewayUrl=ws%3A%2F%2F127.0.0.1%3A18789#token=YOUR_TOKEN
```

### 6.2 看 WebSocket 协议交互

浏览器 DevTools → Network → WS → 看到 frames，按 OpenClaw 协议 v4。

关键 method：`connect`、`chat.send`、`chat.history`、`chat.abort`、`sessions.list`。
事件：`chat`、`agent`、`sessions.changed`。

### 6.3 看 OpenClaw Gateway 日志

```bash
openclaw logs --follow
# 或
tail -f ~/.openclaw/logs/gateway.log
```

### 6.4 看会话文件

```
~/.openclaw/workspace-dataworks/sessions.json
```

直接 cat 看 sessions 是否正确写入。

---

## 7. 不要做的事（红线）

| ❌ 不要 | 原因 |
|--------|------|
| PTY spawn `/bin/bash` 或任意 shell | 只 spawn `openclaw chat`，D12 决策关掉了 exec 工具 |
| 改 `docs/` 官方文档树 | 与 DataWorks 交付无关，易干扰阅读 |
| 新加 admin 类 tab / 暴露 config 编辑 | 嵌入数据中台不需要 |
| 直接用 React/Vue 写组件 | OpenClaw 用 Lit，混栈会乱 |
| 在前端 TUI 视图里自己做 chat.send | PTY 方案下所有 UI 逻辑由原生 TUI 处理 |
| 写死 Gateway URL / token | 走环境变量 / postMessage |
| 把客户对话内容打到 console.log | 合规风险 |
| 启用 `exec` / `browser` / `plugins` 工具 | 违反 D12 决策 |

---

## 8. 关键协议与 PTY Bridge 架构

### 8.1 Chat 模式 — Gateway RPC

浏览器 Control UI 通过 `GatewayBrowserClient`（`mode: "webchat"`）连接 Gateway WS，走标准 RPC：

```
connect → chat.send → chat.history → chat.abort → sessions.list
事件：chat / agent / sessions.changed
```

详见 <https://docs.openclaw.ai/gateway/protocol>。**TUI 视图不使用这些 RPC**——所有交互由 PTY 子进程内的原生 TUI 完成。

### 8.2 TUI 模式 — PTY Bridge 协议

浏览器 xterm 通过 **独立 WS 连接**（`/tui/pty`）连到 Gateway PTY Bridge，不走 Gateway RPC。
数据流是纯字节流（ANSI / stdin），没有 JSON-RPC 结构：

```
浏览器 xterm.onData  →  WS /tui/pty  →  node-pty stdin   → openclaw chat
openclaw chat stdout  →  node-pty     →  WS /tui/pty      → xterm.write()
```

**唯一结构化消息：resize**
```json
// 浏览器 → Gateway（仅 resize 事件是 JSON，其余都是 raw bytes）
{ "type": "resize", "cols": 120, "rows": 40 }
```

**连接建立流程：**
1. 浏览器发起 WS upgrade：`ws://gateway:18789/tui/pty?token=xxx&sessionKey=agent:main:main`
2. Gateway 鉴权 token → `node-pty.spawn("node", ["dist/cli.js", "chat", "--url", gatewayUrl, "--token", token, "--session", sessionKey])`
3. PTY bridge 建立 WS ↔ PTY 双向管道
4. `openclaw chat` 子进程自己通过 `GatewayClient`（`mode: "ui"`, `clientName: "openclaw-tui"`）连 Gateway，走标准 RPC 与 LLM 交互

### 8.3 Session 共享

| 视图 | 客户端类型 | mode | 连接目标 |
|------|-----------|------|---------|
| Chat | `GatewayBrowserClient` | `"webchat"` | Gateway WS（标准 RPC） |
| TUI 子进程 | `GatewayClient` | `"ui"` | Gateway WS（标准 RPC，子进程自行连接） |
| 浏览器 xterm | 原生 WebSocket | — | Gateway `/tui/pty`（PTY 字节流） |

两个独立客户端通过 `--session` 参数共享同一 sessionKey，消息历史互通。

---

## 9. 升级与维护

本仓库为**本地独立项目**，日常**不做 upstream 同步**。需要对照官方行为时，仅查阅
<https://docs.openclaw.ai/> 或 issue（如 [#77362 Web Terminal](https://github.com/openclaw/openclaw/issues/77362)），
再在本仓库自行实现或调整。

### 升级依赖

```bash
pnpm update --interactive
# 谨慎升级 lit / vite / xterm / node-pty，可能 break
```

### node-pty 特别注意

`node-pty` 是 native addon，升级后需要重新编译。如果升级失败：
1. 确认 node-gyp + build 工具链就绪
2. 尝试 `pnpm rebuild node-pty`
3. 如果持续失败，考虑换 `@homebridge/node-pty-prebuilt-multiarch`（预编译包）

---

## 10. 已知坑与约定（审计 2026-05-25，T3 实际调试后更新）

| 误区 | 实际 |
|------|------|
| Chat 首页是 `/` | Control UI Chat 路由是 **`/chat`** |
| CLI 视图复用 Chat 的 WS 连接做 `chat.send` | PTY 方案下 TUI 视图用**独立 WS `/tui/pty`**，纯字节流桥接到 PTY 子进程，不调用任何 Gateway RPC |
| `mode: "tui"` | **不存在**。TUI 子进程用 `mode: "ui"`（`GatewayClient`），浏览器 Chat 用 `mode: "webchat"`（`GatewayBrowserClient`） |
| TUI 视图要自己做 Markdown 渲染 | 不需要。PTY 子进程的原生 TUI 通过 ANSI 输出渲染一切，浏览器 xterm 只做终端仿真 |
| TUI 视图要处理 `/help` 等斜杠命令 | 不需要。原生 TUI 已处理所有斜杠命令，浏览器 xterm 只转发按键 |
| PTY spawn `/bin/bash` | 只 spawn `openclaw tui`，D12 决策关掉了 exec 工具 |
| PTY spawn 用 `openclaw chat` 子命令 | **不行**。`chat`/`terminal` 别名自动启用 `--local` 与 `--url`/`--token` 冲突。必须用规范名 **`openclaw tui`** |
| PTY 子进程需要浏览器给它建 Gateway 连接 | 不需要。`openclaw tui` 子进程自己通过 `GatewayClient`（`mode: "ui"`）连 Gateway |
| `import.meta.url` 路径用 `../../` | **陷阱**。rolldown 打包后 `import.meta.url` 指向 `dist/server.impl-xxx.js`，`../../` 跳出项目根。正确用 **`../`** |
| `gateway.bind` 值 `"loopback"` 直接当 IP | **不行**。`"loopback"` 是符号名，不是 `"127.0.0.1"`。必须用 `resolveGatewayBindHost()` 解析 |
| 需要单独安装 `node-pty` | **不需要**。项目已有 `@lydell/node-pty`（v1.2.0-beta.12 预编译包），Windows 用 ConPTY |
| TUI 启动秒级 | 实际需 **5-10 秒** 连回 Gateway，前端应避免过早断开或判定失败 |
| `cli.ts` 未实现 | **已完成重写**为纯 xterm + PTY WS 桥接（OcCliTerminal Lit Element） |

进度跟踪见 [`STATUS.md`](./STATUS.md)。

---

## 11. PTY Bridge 实际调试经验（T3-C 完成）

### 11.1 node-pty 兼容性

- 项目用 `@lydell/node-pty`（fork of node-pty with prebuilt），无需 node-gyp
- Windows 上用 ConPTY，spawn command 必须用 `process.execPath`（Node.js 可执行文件路径），不能用裸 `"node"`
- 懒加载模式（`import("@lydell/node-pty")`）避免 native addon 在非 PTY 场景下加载

### 11.2 openclaw tui 子进程启动参数差异

- 子命令必须用 `tui`（规范名），`chat`/`terminal` 别名触发 `invokedAsLocalAlias` 导致 `--local` 冲突
- `--url` 格式：`ws://127.0.0.1:18789`（必须是解析后的 IP，不能用 `"loopback"` 符号名）
- Windows 上 spawn：`process.execPath` + `[openclaw.mjs路径, "tui", "--url", ..., "--session", ..., "--token", ...]`
- 子进程环境继承 `process.env`，不需要额外设置 `OPENCLAW_TUI_QUIET`

### 11.3 import.meta.url 路径陷阱

- rolldown/tsdown 打包后，`import.meta.url` 指向 `dist/server.impl-xxx.js`
- 从该路径 `../../openclaw.mjs` 解析到 `D:\code\openclaw.mjs`（跳出项目根 `D:\code\openclaw\`）
- 修正：`../openclaw.mjs` 和 `../dist/entry.js`（从 `dist/` 上一级到项目根）
- 路径探测用 `existsSync` 验证，最终 fallback 为 PATH 上的 `openclaw`

---

**最后更新：** 2026-05-25（T3 完成；§10 更新调试坑点至 13 条；§11 补充 PTY 实际调试经验）
