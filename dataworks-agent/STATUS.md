# DataWorks Agent · 当前进度

> 随开发推进更新本文件；详细计划见 [`PLAN.md`](./PLAN.md)。

**最后更新：** 2026-05-26（T4.5 ChatAgent 新页面完成）

---

## 里程碑

| 阶段 | 状态 | 说明 |
|------|------|------|
| T0 文档/基线 | ✅ | 文档齐全，基线已锁 |
| **T1 Gateway** | **🟡 部分完成** | T1.1/1.4/1.5 已通；T1.2/1.3 未做；T1.6 暂缓 |
| **T2 浏览器 Chat** | **✅** | 可对话；Control UI 已做小幅 DataWorks 标识 |
| T3-A 后端 PTY Bridge | ✅ | `server-pty.ts` 已建，`server-http.ts` 已改 |
| T3-B 前端 TUI 视图 | ✅ | `cli.ts` 已重写为 PTY 桥接，app-render 已适配 |
| T3-C 集成调试 | ✅ | PTY spawn/输出/resize/键盘/Auth/断开清理全部通过 |
| T4 Chat/TUI Toggle | ✅ | segmented toggle + 路由切换 + PTY 生命周期 |
| **T4.5 ChatAgent 新页面** | **✅** | `/chatagent` 自定义 shell + 左会话栏 + 顶栏导出/Chat-TUI + 会话菜单 |
| T5–T6 | ⬜ | |

---

## 仓库快照（审计于 2026-05-22）

| 项 | 当前值 |
|----|--------|
| 工作目录 | `d:\code\openclaw`（本机 clone） |
| 当前分支 | `main`（跟踪 `origin/main`） |
| `origin`（可选） | `https://github.com/Jane-Qin/openclaw.git` —— 仅备份/协作，非必须 |
| upstream | **不需要** —— 本地独立项目，不与官方主线同步 |
| 开发分支 `dev-dataworks-agent` | **未创建** |
| OpenClaw 包版本 | `2026.5.21` |
| 基线 commit | `49e3f8c3ee02f6a8f6c5830bd596a8c660d881a2` |
| 基线 describe | `v2026.4.19-beta.2-18980-g49e3f8c3ee` |
| `dataworks-agent/` 目录 | 已就绪，**尚未 git add** |

---

## 任务进度（P0）

| ID | 任务 | 状态 | 备注 |
|----|------|------|------|
| T0.1 | ~~upstream / 远程~~ | — 跳过 | 本地项目，不配置 upstream |
| T0.2 | 锁定基线版本 | ✅ 已记录 | 见 [`PLAN.md` §11](./PLAN.md) |
| T0.3 | 创建 `dev-dataworks-agent` 分支 | ⬜ 待做 | |
| T0.4 | 初始化 `dataworks-agent/` 文档 | ✅ 完成 | 本目录 4 个文件 + STATUS |
| T1 | Gateway 跑通 | 🟡 部分完成 | T1.2/T1.3 待补 |
| T1.1 | `pnpm install` | ✅ | |
| T1.2 | `~/.openclaw/openclaw.json` | ⬜ **未做** | 未按 `openclaw.example.json5` 配置 DataWorks 策略 |
| T1.3 | 环境变量 Key / token | ⬜ **未做** | 未设 `PLATFORM_OPENAI_KEY` / `GATEWAY_TOKEN`（或用的别的方式） |
| T1.4 | 启动 Gateway | ✅ | |
| T1.5 | `openclaw chat` 对话 | ✅ | 已验证可流式对话 |
| T1.6 | `sandbox explain` | ⏸ 暂缓 | 演示/嵌入前再补（见 PLAN） |
| T2 | Control UI Chat 跑通 | ✅ | 18789 + 5173 `/chat` 可对话；UI 已加 DataWorks 标识 |
| T2.1 | `pnpm ui:build` | ✅ | 欢迎页徽章 + 页签标题 |
| T2.2–T2.3 | 浏览器 Chat | ✅ | 用户已验收 |
| T2.4 | 记录 sessionKey | ✅ | 示例：`agent:main:main` |
| **T3-A** | **后端 PTY Bridge** | **✅ 完成** | `server-pty.ts` 已建，`server-http.ts` 已改 |
| T3-A.1 | 安装 `node-pty` | ✅ | 已有 `@lydell/node-pty`（预编译包，无需 node-gyp） |
| T3-A.2 | 新建 `src/gateway/server-pty.ts` | ✅ | PTY bridge 模块（handlePtyUpgrade, startPtySession, resolveOpenclawChatCommand） |
| T3-A.3 | 修改 `src/gateway/server-http.ts` | ✅ | upgrade handler 加 `/tui/pty` 路径 |
| T3-A.4 | PTY 生命周期管理 | ✅ | cleanup, MAX_PTY_SESSIONS=10, activePtyCount |
| T3-A.5 | WS ↔ PTY 数据桥接 | ✅ | stdin/stdout/resize JSON |
| **T3-B** | **前端 TUI 视图** | **✅ 完成** | `cli.ts` 已重写为 PTY 桥接 |
| T3-B.1 | xterm + xterm-addon-fit | ✅ | 已安装 |
| T3-B.2 | 重写 `ui/src/ui/views/cli.ts` | ✅ | 纯 xterm + PTY WS 桥接（OcCliTerminal Lit Element） |
| T3-B.3 | `navigation.ts` 注册 cli tab | ✅ | 已注册 `/cli` |
| T3-B.4 | `app-render.ts` 加渲染分支 | ✅ | props 适配 PTY bridge |
| **T3-C** | **集成调试** | **✅ 完成** | |
| T3-C.1 | 端到端联调 | ✅ | PTY spawn → TUI 连 Gateway → 13k 字节 ANSI 输出 |
| T3-C.2 | resize 事件传递 | ✅ | JSON resize → pty.resize → TUI 重渲染 |
| T3-C.3 | sessionKey 传递 | ✅ | --session 参数传入，Chat/TUI 共享历史 |
| T3-C.4 | 异常处理 | ✅ | 无效 token → 401; WS 断开 → PTY cleanup |
| T4 | Chat/TUI Toggle | ✅ 完成 | segmented toggle，路由 `/chat` ⇄ `/cli`，PTY 断开/重连 |
| T4.1 | chat header 加 toggle | ✅ | `renderChatTuiToggle()` in `app-render.helpers.ts` |
| T4.2 | 路由切换保持 sessionKey | ✅ | `state.setTab()` 切换，sessionKey 自动保持 |
| T4.3 | PTY 会话生命周期 | ✅ | 切走断开，切回重连；修复 `onData` disposable 泄漏 |
| **T4.5** | **ChatAgent 新页面** | **✅ 完成** | `/chatagent` 自定义 shell，旧页不受影响 |
| T4.5.1 | Tab 路由注册 | ✅ | `navigation.ts` 加 `chatagent` Tab + `/chatagent` 路由 + `isChatSurfaceTab()` |
| T4.5.2 | 状态字段 | ✅ | `chatAgentViewMode`/`chatAgentSessionsCollapsed`/`chatAgentSessionMenuKey` |
| T4.5.3 | 自定义 shell 渲染 | ✅ | `renderChatAgentPage()` + `renderChatAgentSessionGroups()` |
| T4.5.4 | 公共代码适配 | ✅ | `app-settings.ts`/`app-lifecycle.ts` 补 chatagent 条件 |
| T4.5.5 | 样式 | ✅ | `layout.css` 新增 chatagent 布局 |
| T5 | iframe 嵌入 | ⬜ 待做 | |
| T6 | 演示准备 | ⬜ 待做 | |

---

## 代码库审计要点（与文档对齐）

1. **Chat 路由**：`ui/src/ui/navigation.ts` 中 Chat tab 路径为 **`/chat`**，不是 `/`。
2. **Gateway 客户端模式**：Chat 视图用 `GatewayBrowserClient`（`mode: "webchat"`）；TUI 子进程用 `GatewayClient`（`mode: "ui"`，`clientName: "openclaw-tui"`）。`mode: "tui"` 不存在于 `GATEWAY_CLIENT_MODES` 中。
3. **TUI 视图不是 RPC 调用**：TUI 视图通过独立 WS `/tui/pty` 连 Gateway PTY Bridge，走纯字节流（ANSI/stdin），不调用 `chat.send` 等 Gateway RPC。所有 UI 逻辑由 `openclaw tui` 子进程的原生 TUI 处理。
4. **Session 共享机制**：Chat 和 TUI 是两个独立 Gateway 客户端，通过 `--session` 参数共享同一 sessionKey，消息历史互通。
5. **PTY spawn 用 `tui` 子命令**：必须用 `openclaw tui`（规范名），不能用 `openclaw chat` 或 `openclaw terminal`——后两个别名会自动启用 `--local`，与 `--url`/`--token` 冲突。
6. **`import.meta.url` 路径陷阱**：在 rolldown/tsdown 打包后，`import.meta.url` 指向 `dist/server.impl-xxx.js`，相对路径 `../../` 会跳出项目根。正确做法是用 `../`（从 `dist/` 上一级到达项目根）。
7. **`gateway.bind` 是符号名**：配置值 `"loopback"` 不是 IP 地址，传给 `openclaw tui --url` 会导致连接失败。必须用 `resolveGatewayBindHost()` 解析为 `"127.0.0.1"`。
8. **`@lydell/node-pty` 预编译**：项目已有此包（v1.2.0-beta.12），无需额外安装 node-pty 或 node-gyp。Windows 上用 ConPTY，spawn command 必须是 `process.execPath`。
9. **TUI 启动耗时**：`openclaw tui` 子进程从 spawn 到连上 Gateway 约 5-10 秒，前端应避免过早断开 WS。
10. **Chat/TUI Toggle**：segmented toggle 在 content-header `page-meta` 区域（`renderChatTuiToggle` in `app-render.helpers.ts`），点击调用 `state.setTab()` 切换 `/chat` ⇄ `/cli`。TUI 模式下不显示 chat controls（refresh/thinking/toolcalls/focus/cron）。切走 TUI 时 PTY WS 断开、子进程被杀；切回时重新 spawn。`OcCliTerminal.onData` 回调必须通过 disposable 管理，避免重复 `connectPty` 时泄漏。
11. **ChatAgent 页面（`/chatagent`）**：自定义 shell（`renderChatAgentPage` in `app-render.ts`），完全绕过现有 sidebar + content-header 布局。Chat/TUI 切换使用 `state.chatAgentViewMode`（同页内切），不复用 T4 的 `renderChatTuiToggle()`（它用 `state.setTab` 跨 tab 跳转）。`isChatSurfaceTab()` 统一 chat/cli/chatagent 的公共逻辑判断。旧页 `/chat`/`/cli` 行为不受影响——所有改动为纯增量扩展。
12. **公共代码影响范围**：`navigation.ts`（新增 tab+路由+辅助函数）、`app-settings.ts`（`refreshActiveTab` 加 case、`applyTabSelection`/`syncUrlWithTab` 补条件）、`app-lifecycle.ts`（`handleUpdated` 用 `isChatSurfaceTab`）、`app-render.helpers.ts`（导出 `resolveSidebarChatSessionKey`）。所有改动不修改已有分支逻辑。

---

## 建议的下一步（按顺序）

**当前重点：T5 iframe 嵌入数据中台**

| 步骤 | 命令/操作 |
|------|----------|
| 1. basePath 配置 | `gateway.controlUi.basePath: "/openclaw"` |
| 2. allowedOrigins | 加数据中台域名 |
| 3. Nginx 反代 | `/openclaw/* → http://gateway:18789/*`，带 WS 升级 |
| 4. iframe 嵌入 | `<iframe src="/openclaw/" />` |
| 5. token 传递 | postMessage → sessionStorage |

**补做：** T1.2/T1.3（DataWorks 配置与平台 Key）；T1.6 演示前再补。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-22 | 初稿：基线锁定、任务状态、代码审计要点 |
| 2026-05-22 | 明确本地项目：取消 upstream 同步相关任务 |
| 2026-05-22 | T1 部分完成：T1.1/T1.4/T1.5 可对话；T1.2/T1.3 未做；T1.6 暂缓 |
| 2026-05-25 | 修正审计要点 #2：`mode:"tui"` 不存在；CLI 与 Chat 共用同一 `GatewayBrowserClient` 实例（`mode: "webchat"`） |
| 2026-05-25 | **架构升级**：T3 从"Chat+CLI 双渲染"拆分为 T3-A/T3-B/T3-C；TUI 采用 xterm.js + PTY 桥接方案 |
| 2026-05-25 | **T3 完成**：T3-A/T3-B/T3-C 全部通过；修复 3 个关键 bug（import.meta.url 路径、chat→tui 子命令、bind 符号名解析）；审计要点扩展至 9 条；下一步改为 T4 |
| 2026-05-26 | **T4 完成**：Chat/TUI segmented toggle 实现；路由 `/chat` ⇄ `/cli` 保持 sessionKey；PTY 切走断开/切回重连；修复 `onData` disposable 泄漏；下一步改为 T5 |
| 2026-05-26 | **T4.5 完成**：`/chatagent` 新页面实现；CHATAGENT.md 审查修订 7 点落地；公共代码纯增量扩展（`isChatSurfaceTab`/`refreshActiveTab` case/`applyTabSelection` 条件/`handleUpdated` 条件）；旧页行为不变；build 通过；27 项测试通过；审计要点扩展至 12 条 |
