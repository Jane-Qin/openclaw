# DataWorks Agent · 当前进度

> 随开发推进更新本文件；详细计划见 [`PLAN.md`](./PLAN.md)。

**最后更新：** 2026-05-25（T3 全部完成，集成调试通过）

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
| T4 Chat/TUI Toggle | ⬜ **下一重点** | |
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
| T4 | Chat/TUI Toggle | ⬜ **下一重点** | 路由 **`/chat` ⇄ `/cli`** |
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

---

## 建议的下一步（按顺序）

**当前重点：T4 Chat/TUI Toggle**

| 步骤 | 命令/操作 |
|------|----------|
| 1. session-controls.ts 加 toggle | Chat header 区域加 "Chat / TUI" segmented toggle |
| 2. 路由切换 | 点击 toggle 切换 `/chat` ⇄ `/cli`，保持 sessionKey |
| 3. PTY 会话管理 | 切走时决定是否保留 PTY 会话 |
| 4. 验证 | Chat 发消息 → 切 TUI 看历史 → 反之亦然 |

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
