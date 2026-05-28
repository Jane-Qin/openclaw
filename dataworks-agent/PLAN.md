# DataWorks Agent · MVP 开发计划

> 本文档是本地 OpenClaw 二开项目的开发计划，不是 OpenClaw 官方文档。
> 放在 `dataworks-agent/` 目录，与业务代码（主要在 `ui/`）分开，便于查阅。
> **本仓库为本地独立维护，不配置 upstream、不与官方主线同步。**

---

## 1. 一句话目标（MVP）

在我们自己的数据中台浏览器端产品里，嵌入一个基于 OpenClaw 二开的 AI 助手页面，
支持 **Chat** 与 **TUI** 两种视图在同一会话上下文中切换，后端走单一 OpenClaw Gateway，
平台统一 AI Key，外部工具默认全关。TUI 模式采用 **xterm.js + PTY 桥接**，在浏览器中嵌入原生 `openclaw chat` 终端界面。

**5-7 个工作日跑通可演示原型。**

---

## 2. 原始诉求（领导原话）

> "客户那边一般会提供 aikey，或者智能体，但是很难提供指定的工具，尤其是国外的，
> 先以 openclaw 为例进行集成，集成 chat，以及 tui 能力"

---

## 3. 范围

### 3.1 In Scope（P0 必做）

- 基于 OpenClaw 代码**本地 clone 二开**（独立维护，可选推团队 Git 备份）
- 单一 OpenClaw Gateway 实例
- 平台统一 AI Key（OpenClaw `models.providers` 由平台配置）
- 默认 agent（不做智能体选择 UI，命令行 `/agent` 切换即可）
- Chat 视图（直接用 OpenClaw Control UI 现有 chat 组件）
- TUI 视图（新增，xterm.js + PTY 桥接，在浏览器中运行原生 `openclaw chat`）
- 同 sessionKey 在 Chat ⇄ TUI 间切换
- 会话存储用 OpenClaw 自带 `sessions.json`（文件）
- 嵌入方式：iframe 同域反代 + 独立 URL 两种都支持
- `tools.deny` 默认关闭 OpenClaw 外部工具（exec / browser / MCP / plugins）

### 3.2 Out of Scope（MVP 不做）

| 项 | 后期再说 |
|----|---------|
| DataWorks 风格视觉精修 | 用 OpenClaw 默认皮 |
| 智能体下拉 UI | 用默认 agent |
| 品牌替换（Logo / 产品名） | MVP 保留 OpenClaw 标识，演示后再做 |
| Admin tab 隐藏 | 演示时不点进去；正式版要做 |
| 推荐卡片 / 欢迎页 / 多语言 / 主题 / 会话搜索 | 全 P1 |
| 多客户 / 多租户隔离 | 试点期单客户演示 |
| 配额限流 / 计费 | 平台付费维度，演示不需要 |
| 高可用 / 多 region | 单实例 |
| 任意 shell（bash/zsh） | PTY 只 spawn `openclaw chat`，不开通用 shell |
| 客户自带工具 / 国外 MCP | 不支持，需求边界 |
| 鉴权 / 用户管理 / 多租户后台 | **由宿主数据中台负责** |

---

## 4. 架构

### 4.1 部署拓扑

```
+-----------------------------------+
|  数据中台（宿主产品，浏览器端）         |
|  - 用户已登录                       |
|  - 某页签 iframe / 跳转 URL          |
+----------------|------------------+
                 |
                 v (iframe 或独立页)
+-----------------------------------+
|  Fork 的 OpenClaw Control UI       |
|  - Vite + Lit Web Components       |
|  - Chat 视图（OpenClaw 现成）         |
|  - TUI 视图（xterm.js + PTY）       |
|  - 右上角 Chat/TUI Toggle           |
+-------|-------------|-------------+
        |             |
        | WS          | WS (/tui/pty)
        | chat.send   | PTY stdin/stdout
        v             v
+-----------------------------------+
|  OpenClaw Gateway（单实例）          |
|  - models.providers (平台 Key)      |
|  - agents.list (默认 agent)         |
|  - tools.deny (全关外部工具)         |
|  - sessions.json (文件存储)          |
|  - PTY Bridge（新增，spawn TUI）    |
+-------|---------------------------+
        |  ^ 子进程
        v  |
+-----------------------------------+
|  openclaw chat (TUI 进程)          |
|  - pi-tui 渲染 → ANSI → PTY       |
|  - 自己连 Gateway (mode: "ui")     |
+-------|---------------------------+
        |
        v
+-----------------------------------+
|  外部 LLM Provider                  |
|  （OpenAI / 阿里通义 / Anthropic …） |
+-----------------------------------+
```

### 4.2 关键数据流

**Chat 模式：**
浏览器 → WS `chat.send` → Gateway → LLM Provider → 流式回到浏览器 → 渲染气泡

**TUI 模式（PTY 桥接）：**
浏览器 xterm 按键 → WS `/tui/pty` → Gateway PTY Bridge → `node-pty` stdin → `openclaw chat` 子进程
`openclaw chat` pi-tui ANSI 输出 → PTY stdout → WS → 浏览器 xterm.write()
TUI 子进程自己通过 `GatewayClient`（`mode: "ui"`, `clientName: "openclaw-tui"`）连 Gateway，走 `chat.send` 与 LLM 交互。

**Session 共享：**
Chat 视图使用 `GatewayBrowserClient`（`mode: "webchat"`），TUI 子进程使用 `GatewayClient`（`mode: "ui"`）——两个独立客户端，通过 `--session` 参数共享同一 sessionKey，消息历史互通。

---

## 5. 决策记录（已定的事，不再重新讨论）

| # | 决策 | 备注 |
|---|------|------|
| D1 | 路线选 **Fork 二开**，不全自研、不仅 iframe 嵌入 | 在 Control UI 上改 |
| D2 | **本地 clone 独立维护**，不与 openclaw 官方仓库同步 | 可选 `origin` 推团队 Git 做备份 |
| D3 | **不做 upstream fetch / merge / cherry-pick** | 需要时仅人工参考官方文档或 issue，不纳入日常流程 |
| D4 | AI Key 由**平台统一**提供 | 客户给 Key 路径 MVP 不做（架构预留） |
| D5 | "客户提供智能体" 在 UI 上是 **YOLO 位置的下拉** | MVP 不做下拉，用默认 agent |
| D6 | Chat 与 TUI **共享同一 sessionKey** | Chat 用 `GatewayBrowserClient`（`mode: "webchat"`），TUI 是独立 `openclaw chat` 子进程（`mode: "ui"`），两者通过 `--session` 参数共享 sessionKey |
| D7 | TUI 视图用 **xterm.js + PTY 桥接** 嵌入原生 `openclaw chat` | 原生 TUI 所有功能（Markdown、picker、工具卡片、斜杠命令）零成本获得；不自己实现渲染 |
| D8 | 会话存储用 **OpenClaw `sessions.json`** | 不做数据库 |
| D9 | 嵌入方式 **iframe + 独立 URL 都支持** | P0 用同域反代回避跨域 |
| D10 | 前端栈不熟靠 **AI vibecoding** 补 | 团队不强依赖 Lit 熟练度 |
| D11 | 默认 **隐藏 admin tab**（正式版必做） | MVP 演示时不点进去，正式版改 `ui/src/ui/navigation.ts` |
| D12 | 工具默认 **全 deny** 外部工具 | exec / browser / MCP / plugins |
| D13 | 视觉改造按 **轻 + 部分中等** | 不重做整体设计语言 |

---

## 6. P0 任务清单

> 估时基于 AI vibecoding 加速假设。每项含 ID、依赖、验收标准。

### T0 仓库准备（0.5 天）

| Task | 详细 |
|------|------|
| **T0.1** | ~~upstream 远程~~ | **跳过** —— 本地项目，不配置 upstream |
| **T0.2** | 锁定开发基线 commit，记录到本文档 §11 | |
| **T0.3** | （可选）从 `main` 拉 `dev-dataworks-agent`；也可直接在 `main` 开发 | |
| **T0.4** | 初始化 `dataworks-agent/` 文档与配置样例 | ✅ 已完成 |

**验收：** `dataworks-agent/` 目录齐全；基线已记录；本地能 `pnpm install`。

### T1 Gateway 跑通（0.5-1 天）— 🟡 部分完成（2026-05-22）

| Task | 状态 | 详细 |
|------|------|------|
| **T1.1** | ✅ | 安装依赖：`pnpm install`（OpenClaw 是 monorepo，需要 pnpm-workspace） |
| **T1.2** | ⬜ | 准备 `~/.openclaw/openclaw.json`（参考 `dataworks-agent/openclaw.example.json5`）— **未做** |
| **T1.3** | ⬜ | 设置环境变量：`PLATFORM_OPENAI_KEY`、`GATEWAY_TOKEN` — **未做** |
| **T1.4** | ✅ | 启动 Gateway：`pnpm openclaw gateway` |
| **T1.5** | ✅ | 命令行验证：`openclaw chat` 能进 TUI 并跑通对话 |
| **T1.6** | ⏸ 暂缓 | `openclaw sandbox explain` — **演示/嵌入（T5/T6）前再补** |

**验收（已达）：** 命令行能流式对话（当前可能用的是既有配置/Key，非 DataWorks 样例）。  
**待补：** T1.2、T1.3（DataWorks 配置与平台 Key）；T1.6（工具策略自查，非阻塞）。

### T2 Control UI 跑通（0.5 天）— ✅ 已完成（2026-05-22）

| Task | 状态 | 详细 |
|------|------|------|
| **T2.1** | ✅ | `pnpm ui:build` → `dist/control-ui/` |
| **T2.2** | ✅ | `http://127.0.0.1:18789/` 可访问 |
| **T2.3** | ✅ | `/chat` 可对话（含 `localhost:5173` dev） |
| **T2.4** | ✅ | sessionKey 示例：`agent:main:main` |

**二开验证改动：** 欢迎页增加 **DataWorks Agent** 徽章；页签标题改为 DataWorks Agent（`ui/src/ui/dataworks-branding.ts` 等）。

**验收（已达）：** 浏览器 Chat 流式正常；`pnpm ui:build` 后 18789 硬刷新可见标识。

### T3 加 TUI 视图（**核心，3-4 天**）

> TUI 模式采用 xterm.js + PTY 桥接方案：浏览器 xterm 连 Gateway 的 PTY WS 端点，
> Gateway 用 `node-pty` spawn `openclaw chat` 子进程，桥接 stdin/stdout。
> 原生 TUI 所有功能（Markdown 渲染、picker、工具卡片、斜杠命令）自动获得。

#### T3-A 后端 PTY Bridge（1.5-2 天）

| Task | 详细 |
|------|------|
| **T3-A.1** | 安装 `node-pty` 依赖 — ✅ 已有 `@lydell/node-pty`（v1.2.0-beta.12 预编译包） |
| **T3-A.2** | 新建 `src/gateway/server-pty.ts`：PTY bridge 模块 — ✅ 完成。spawn 用 `process.execPath` + `openclaw.mjs tui`（不是 `chat`，因为 chat 别名自动启用 --local）；路径探测用 `../openclaw.mjs` 和 `../dist/entry.js`（不是 `../../`，因为 import.meta.url 在 rolldown 中指向 dist/）；bindHost 用 `resolveGatewayBindHost()` 解析符号名 |
| **T3-A.3** | 修改 `src/gateway/server-http.ts`：upgrade handler 增加 `/tui/pty` 路径分支，鉴权后转交 PTY handler |
| **T3-A.4** | PTY 生命周期管理：WS 关闭时 `pty.kill()`，并发限制，超时清理 |
| **T3-A.5** | WS ↔ PTY 数据桥接：`pty.onData → ws.send`，`ws.onmessage → pty.write`，resize 事件 `pty.resize(cols, rows)` |

**验收：** 命令行 `wscat -c ws://localhost:18789/tui/pty` 能连接并看到 TUI ANSI 输出。

#### T3-B 前端 TUI 视图（0.5-1 天）

| Task | 详细 |
|------|------|
| **T3-B.1** | 引入 `xterm` 和 `xterm-addon-fit`（`pnpm add -D -F openclaw-control-ui xterm xterm-addon-fit`）— ✅ 已安装 |
| **T3-B.2** | 重写 `ui/src/ui/views/cli.ts`：纯 xterm + PTY WS 桥接（xterm.onData → ws.send，ws.onmessage → xterm.write） |
| **T3-B.3** | 在 `ui/src/ui/navigation.ts` 注册 `cli` tab，路径 **`/tui`** — ✅ 已注册（当前路径为 `/cli`，可改为 `/tui` 或保留） |
| **T3-B.4** | 在 `ui/src/ui/app-render.ts` 加 TUI 视图渲染分支 — ✅ 已加 |

**验收：** 浏览器 `/cli`（或 `/tui`）能进入终端；看到原生 TUI 界面；输入 `/help` 有命令列表；与 `/chat` 共享同一 sessionKey 历史。

#### T3-C 集成调试（1 天）

| Task | 详细 |
|------|------|
| **T3-C.1** | 端到端联调：浏览器 xterm → Gateway PTY → openclaw chat → 流式对话 |
| **T3-C.2** | resize 事件传递：浏览器窗口缩放 → xterm resize → WS → pty.resize |
| **T3-C.3** | sessionKey 传递：从 Chat 视图切到 TUI 时，当前 sessionKey 通过 PTY spawn 参数传入 |
| **T3-C.4** | 异常处理：PTY 进程崩溃、WS 断开、超时无输出 |

**验收：** 浏览器 TUI 完整可用：能对话、能 `/help`、Ctrl+L picker 选模型、Ctrl+G 选 agent。

**降级方案（如果 PTY bridge 卡壳）：**
1. **降级 A**：TUI 子进程改用 `--local` 模式（嵌入式 runtime，不经过 Gateway），减少一跳
2. **降级 B**：回退到原 Chat+CLI 方案（xterm 直接做 `chat.send` 的终端式渲染，不经过 PTY）

### T4 Chat/TUI 切换 Toggle（0.5 天）— ✅ 已完成（2026-05-26）

| Task | 状态 | 详细 |
|------|------|------|
| **T4.1** | ✅ | 在 `ui/src/ui/app-render.helpers.ts` 加 `renderChatTuiToggle()` segmented toggle "Chat / TUI"，放在 content-header `page-meta` 区域 |
| **T4.2** | ✅ | 点击切换路由：**`/chat` ⇄ `/cli`**，sessionKey 通过 `state.sessionKey` 自动保持，无需 URL 参数 |
| **T4.3** | ✅ | 旧页 `/chat`⇄`/cli`：切走断开、切回重连；`/chatagent` 见 **T4.6** 保活 |
| **T4.6** | ✅ | `/chatagent` 同 session Chat/TUI hide/show 保活 PTY；换 session 重连 |

**修改文件：**
1. `ui/src/ui/app-render.helpers.ts` — 新增 `renderChatTuiToggle()` 函数
2. `ui/src/ui/app-render.ts` — 导入并在 content-header 渲染 toggle；TUI 模式下隐藏 chat controls
3. `ui/src/styles/layout.css` — 新增 `.chat-tui-toggle` segmented toggle 样式
4. `ui/src/ui/views/cli.ts` — 修复 `onData` 回调 disposable 泄漏（重复 `connectPty` 时旧回调未清理）

**验收：** Chat 模式发了消息切到 TUI 能看到刚才的对话；反之亦然。

### T4.5 ChatAgent 新页面 — ✅ 已完成（2026-05-26）

> 基于 CHATAGENT.md 规格实现的 `/chatagent` 新产品页，PinchChat 式嵌入对话工作台。
> **旧页 `/chat`、`/cli` 行为完全不变。**

| Task | 状态 | 详细 |
|------|------|------|
| **T4.5.1** | ✅ | 注册 `chatagent` Tab + 路由 `/chatagent`（`navigation.ts`）；新增 `isChatSurfaceTab()` 辅助函数 |
| **T4.5.2** | ✅ | `app-view-state.ts` 新增 `chatAgentViewMode`/`chatAgentSessionsCollapsed`/`chatAgentSessionMenuKey` 状态；`app.ts` 初始化 |
| **T4.5.3** | ✅ | `app-render.ts` 新增 `renderChatAgentPage()` + `renderChatAgentSessionGroups()` — 自定义 shell（左会话栏+中间对话区），绕过现有 sidebar/content-header 布局 |
| **T4.5.4** | ✅ | `app-settings.ts` — `refreshActiveTab` 加 `case "chatagent"`；`applyTabSelection` 补 chat surface 条件；`syncUrlWithTab` 补 session 参数同步 |
| **T4.5.5** | ✅ | `app-lifecycle.ts` — `handleUpdated` chat 滚动条件改用 `isChatSurfaceTab()` |
| **T4.5.6** | ✅ | `layout.css` 新增 `.shell--chatagent` 及子组件样式 |
| **T4.5.7** | ✅ | `app-render.helpers.ts` — 导出 `resolveSidebarChatSessionKey` |

**修改文件：**
1. `ui/src/ui/navigation.ts` — Tab 类型加 `"chatagent"`；TAB_PATHS；`isChatSurfaceTab()`；`iconForTab`
2. `ui/src/ui/app-view-state.ts` — 新增 3 个 chatAgent 状态字段
3. `ui/src/ui/app.ts` — `@state()` 初始化 chatAgent 状态
4. `ui/src/ui/app-render.ts` — `renderChatAgentPage()` + `renderChatAgentSessionGroups()`；提前返回 chatagent shell；导入补充
5. `ui/src/ui/app-render.helpers.ts` — 导出 `resolveSidebarChatSessionKey`
6. `ui/src/ui/app-settings.ts` — `refreshActiveTab`/`applyTabSelection`/`syncUrlWithTab` 补 chatagent
7. `ui/src/ui/app-lifecycle.ts` — `handleUpdated` 用 `isChatSurfaceTab()`
8. `ui/src/styles/layout.css` — chatagent 样式

**验收：** 访问 `/chatagent` 为左会话+中对话布局；旧 `/chat`/`/cli` 行为不变；`pnpm ui:build` 通过；14 项 navigation 测试通过；13 项 helpers 测试通过。

### T5 iframe 嵌入数据中台（1 天）

| Task | 详细 |
|------|------|
| **T5.1** | 在 OpenClaw 配置加 `gateway.controlUi.basePath: "/openclaw"`（便于宿主反代） |
| **T5.2** | 在 OpenClaw 配置加 `gateway.controlUi.allowedOrigins: ["数据中台域名"]` |
| **T5.3** | 数据中台 Nginx 加反代规则：`/openclaw/* → http://gateway:18789/*`，WebSocket 升级头要带上 |
| **T5.4** | 数据中台某页签插入 `<iframe src="/openclaw/" />` |
| **T5.5** | token 传递：简单方案是宿主页 `postMessage` 给 iframe，iframe 把 token 写到 sessionStorage 后建连接 |

**验收：** 数据中台页面打开 → 看到嵌入的 Chat/TUI 页面 → 能跑通完整对话流程。

### T6 演示准备（0.5 天）

| Task | 详细 |
|------|------|
| **T6.1** | 写 5 分钟演示稿（背景 → 架构 → 演示 → 风险） |
| **T6.2** | 准备 4 个演示场景：嵌入打开 / Chat 对话 / 切 CLI / 切回 Chat 看共享历史 |
| **T6.3** | 录一份 2 分钟演示视频作 backup（防演示当天网络/环境问题） |

**验收：** 领导能看明白，问 3 个常见问题（成本、安全、扩展）有答案。

### 总计

**7-9 个工作日**（T3 从 2-3 天扩展为 3-4 天，含后端 PTY bridge 开发）

---

## 7. 关键配置

完整配置见同目录 `openclaw.example.json5`。核心要点：

- `models.providers.openai.apiKey = "${PLATFORM_OPENAI_KEY}"`
- `agents.defaults.model.primary = "openai/gpt-5.5"`（按平台实际可用模型改）
- `tools.deny = ["group:runtime","group:web","group:ui","group:plugins","group:messaging","group:nodes","exec","browser"]`
- `gateway.bind = "127.0.0.1"`，`gateway.auth.mode = "token"`

---

## 8. 风险与降级方案

| 风险 | 影响 | 应对 |
|------|------|------|
| **TUI 视图（T3）卡壳** | 整个 MVP 时间表崩 | 走降级方案（见 T3）；降级 A 改 --local 模式；降级 B 回退 Chat+CLI 方案 |
| **AI vibecoding 改 Lit 翻车** | 反复修 | T3-B 开工前让 AI 先读 `ui/src/ui/views/chat.ts` + `ui/src/ui/navigation.ts` + `ui/src/ui/app-gateway.ts`，建立上下文 |
| **node-pty 编译失败** | T3-A 阻塞 | node-pty 是 native addon，需 node-gyp + build 工具链；Windows 上可能需 `npm install --global windows-build-tools` 或改用 `@homebridge/node-pty-prebuilt-multiarch` 预编译包 |
| **iframe 跨域** | T5 卡 | 走"同域反代"方案，避开 CORS |
| **OpenClaw 与本地代码认知偏差** | 改错 API | 以本仓库代码与 `docs.openclaw.ai` 为准；不假设与官方最新版一致 |
| **平台 Key 泄露** | 安全事故 | Key 走环境变量 / SecretRef，禁止写入仓库；Gateway 鉴权必开 token |
| **演示时 Gateway 崩** | 现场尴尬 | T6.3 录 backup 视频 |

---

## 9. 后续路线（演示通过后）

### P1（4-6 周）

- DataWorks 风格视觉重做（按截图）
- 智能体下拉（顶部 chat header）
- 推荐卡片 + 欢迎页
- 品牌替换（移除 OpenClaw Logo / 名称）
- Admin tab 默认隐藏（正式版必做）
- 客户配置流程（如果重启"客户提供 Key"需求 → 走 per-customer provider 实例方案）
- 平台预置 skill（数据中台业务）

### P2（更远）

- 多租户隔离架构（一客户一 Gateway 或 sessionKey 强隔离）
- 配额 / 限流 / 计费
- 主题切换 / 多语言
- 高可用 / 多 region
- 若需对齐官方能力，人工评估 [Web Terminal #77362](https://github.com/openclaw/openclaw/issues/77362)（不自动 sync）——我们的 PTY bridge 架构与 #77362 一致，spawn 目标是 `openclaw chat` 而非 `/bin/bash`

---

## 10. 参考资料

- OpenClaw 官方文档：<https://docs.openclaw.ai/>
- OpenClaw 协议：<https://docs.openclaw.ai/gateway/protocol>
- OpenClaw Control UI：<https://docs.openclaw.ai/web/control-ui>
- OpenClaw TUI：<https://docs.openclaw.ai/web/tui>
- 工具策略：<https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated>
- 参考竞品：
  - CloudCLI (claudecodeui)：<https://github.com/siteboon/claudecodeui>
  - AgentsMesh：<https://github.com/AgentsMesh/AgentsMesh>
  - Web 终端实现：<https://ysk2014.github.io/blog/2019/09/09/webshell.html>
  - OpenClaw Web Terminal 路线 issue：<https://github.com/openclaw/openclaw/issues/77362>

---

## 11. 基线版本

> T0.2 已锁定（2026-05-22）。进度见 [`STATUS.md`](./STATUS.md)。

- **OpenClaw 包版本：** `2026.5.21`
- **git describe：** `v2026.4.19-beta.2-18980-g49e3f8c3ee`
- **基线 commit SHA：** `49e3f8c3ee02f6a8f6c5830bd596a8c660d881a2`
- **锁定时间：** 2026-05-22
- **维护方式：** 本地独立仓库，**无 upstream**
- **参考（非同步）：** [#77362 Web Terminal](https://github.com/openclaw/openclaw/issues/77362)

---

## 12. 变更记录

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-22 | 初稿（MVP 计划） | discussion |
| 2026-05-22 | 锁定基线；修正 `/chat` 路由；补充 webchat/tui 模式说明；新增 STATUS | audit |
| 2026-05-22 | 明确本地项目：取消 upstream 与同步策略（D2/D3/T0.1） | — |
| 2026-05-22 | T1 部分完成：T1.1/1.4/1.5 ✅；T1.2/1.3 ⬜；T1.6 演示前补 | — |
| 2026-05-25 | 修正协议 inaccuracies：`mode:"tui"` 不存在（§4.2/D6/T3.4）；CLI 与 Chat 共享同一 WS 连接不改 mode；T3.2 包名 `@openclaw/ui` → `openclaw-control-ui`；§3.1 删除"OpenClaw TUI 协议"表述 | audit |
| 2026-05-25 | **架构升级**：T3 从"Chat+CLI 双渲染"改为"Chat+TUI 双模式"；TUI 采用 xterm.js + PTY 桥接方案，spawn `openclaw tui` 子进程；新增后端 PTY Bridge（T3-A）；前端 cli.ts 重写为纯 xterm+WS 桥接（T3-B）；D6/D7 决策更新；§4 架构图重绘；与 #77362 方向对齐 | — |
| 2026-05-25 | **T3 完成**：T3-A/T3-B/T3-C 全部验收通过；修正 spawn 命令从 `chat` → `tui`（避免 --local 冲突）；修正路径从 `../../` → `../`（import.meta.url rolldown 陷阱）；修正 bindHost 用 `resolveGatewayBindHost()` 解析符号名 | — |
| 2026-05-26 | **T4 完成**：Chat/TUI segmented toggle 实现（`renderChatTuiToggle` in `app-render.helpers.ts`）；路由 `/chat` ⇄ `/cli` 保持 sessionKey；TUI 模式下隐藏 chat controls；修复 `OcCliTerminal` onData disposable 泄漏 | — |
| 2026-05-26 | **T4.5 完成**：`/chatagent` 新页面实现（自定义 shell + 左会话栏 + 顶栏导出/Chat-TUI toggle + 会话⋮菜单重命名/删除）；公共代码影响分析通过（`navigation.ts`/`app-settings.ts`/`app-lifecycle.ts` 纯增量扩展）；旧页 `/chat`/`/cli` 行为不变；CHATAGENT.md 审查修订 7 点 | — |
