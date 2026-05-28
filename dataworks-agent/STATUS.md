# DataWorks Agent · 当前进度

> 随开发推进更新本文件；详细计划见 [`PLAN.md`](./PLAN.md)。

**最后更新：** 2026-05-26（T4.6 ChatAgent TUI 保活 + 联调修复）

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
| T4 Chat/TUI Toggle | ✅ | segmented toggle + 路由切换 + PTY 生命周期（旧页 `/chat`⇄`/cli`） |
| **T4.5 ChatAgent 新页面** | **✅** | `/chatagent` 自定义 shell + 左会话栏 + 顶栏导出/Chat-TUI + 会话菜单 |
| **T4.6 ChatAgent TUI 保活** | **✅** | 同会话 Chat/TUI 切换保活 PTY；切回主动刷新历史；换 session 才重连 |
| **T4.7 联调修复** | **✅** | 移动端布局、会话列表、PTY 子进程鉴权、侧栏样式等 |
| T5–T6 | ⬜ | |

---

## 仓库快照（审计于 2026-05-22）

| 项 | 当前值 |
|----|--------|
| 工作目录 | `d:\code\openclaw`（本机 clone） |
| 当前分支 | `dev-agent`（本地二开，大量未提交改动） |
| `origin`（可选） | `https://github.com/Jane-Qin/openclaw.git` —— 仅备份/协作，非必须 |
| upstream | **不需要** —— 本地独立项目，不与官方主线同步 |
| OpenClaw 包版本 | `2026.5.21` |
| 基线 commit | `49e3f8c3ee02f6a8f6c5830bd596a8c660d881a2` |
| `dataworks-agent/` 目录 | 已就绪 |

---

## 任务进度（P0）

| ID | 任务 | 状态 | 备注 |
|----|------|------|------|
| T0.1 | ~~upstream / 远程~~ | — 跳过 | 本地项目，不配置 upstream |
| T0.2 | 锁定基线版本 | ✅ 已记录 | 见 [`PLAN.md` §11](./PLAN.md) |
| T0.3 | 创建 `dev-dataworks-agent` 分支 | 🟡 | 当前在 `dev-agent` |
| T0.4 | 初始化 `dataworks-agent/` 文档 | ✅ 完成 | 本目录 + STATUS |
| T1 | Gateway 跑通 | 🟡 部分完成 | T1.2/T1.3 待补 |
| T1.1 | `pnpm install` | ✅ | |
| T1.2 | `~/.openclaw/openclaw.json` | ⬜ **未做** | 未按 `openclaw.example.json5` 配置 DataWorks 策略 |
| T1.3 | 环境变量 Key / token | ⬜ **未做** | 未设 `PLATFORM_OPENAI_KEY` / `GATEWAY_TOKEN` |
| T1.4 | 启动 Gateway | ✅ | |
| T1.5 | `openclaw chat` 对话 | ✅ | 已验证可流式对话 |
| T1.6 | `sandbox explain` | ⏸ 暂缓 | 演示/嵌入前再补 |
| T2 | Control UI Chat 跑通 | ✅ | 18789 + `/chat` 可对话 |
| **T3-A ~ T3-C** | **PTY Bridge** | **✅** | 见下方审计要点 |
| T4 | Chat/TUI Toggle（旧页） | ✅ | `/chat` ⇄ `/cli` 跨 tab；切走断开/切回重连 |
| **T4.5** | **ChatAgent 新页面** | **✅** | `/chatagent` 自定义 shell |
| **T4.6** | **ChatAgent TUI 保活** | **✅** | 方案 A：hide/show 保活 PTY；切回 TUI 主动 `loadHistory()`；`chatAgentTuiEverOpened` 懒挂载 |
| **T4.7** | **联调修复** | **✅** | 见下方「T4.7 修复清单」 |
| T5 | iframe 嵌入 | ⬜ 待做 | |
| T6 | 演示准备 | ⬜ 待做 | |

### T4.7 修复清单（2026-05-26）

| 问题 | 修复 |
|------|------|
| 小屏聊天区空白 | `layout.mobile.css`：chatagent 单行 grid，`chatagent-main` 占满 |
| 侧栏发灰/非白底 | `layout.css`：`--surface` → `--popover`；drawer 用 `visibility` 非半透明 |
| 小屏 drawer 只有新会话/设置 | drawer 打开时强制 `sessionsCollapsed=false` |
| 重命名/删除菜单无背景 | 菜单 popover 用 `--popover` |
| 左侧只显示 1 agent / 1 session | `CHAT_SESSIONS_LOAD_OVERRIDES`：`configuredAgentsOnly:false`、`limit:100` |
| 重命名后会话列表变短 | `patchSession` / `sessions.changed` 用 chat overrides 刷新 |
| TUI `gateway token mismatch` | `server-pty.ts`：spawn 子进程用 `resolvedAuth` 共享密钥，不用 browser device token |
| PTY WS 鉴权（device token） | `http-auth-utils.ts` + `server-pty.ts` device token 回退 |
| Chat/TUI 每次切换都重连 | **T4.6** 方案 A 保活 |

---

## 代码库审计要点（与文档对齐）

1. **Chat 路由**：`ui/src/ui/navigation.ts` 中 Chat tab 路径为 **`/chat`**，不是 `/`。
2. **Gateway 客户端模式**：Chat 视图用 `GatewayBrowserClient`（`mode: "webchat"`）；TUI 子进程用 `GatewayClient`（`mode: "ui"`，`clientName: "openclaw-tui"`）。
3. **TUI 视图不是 RPC 调用**：浏览器 xterm 通过独立 WS `/tui/pty` 连 Gateway PTY Bridge，纯字节流。
4. **Session 共享机制**：Chat 和 TUI 是两个独立 Gateway 客户端，通过 `--session` 共享同一 sessionKey；TUI 子进程在后台仍收 Gateway 事件，Chat 侧新消息会触发 TUI `loadHistory()`。
5. **PTY spawn 用 `tui` 子命令**：必须用 `openclaw tui`，不能用 `chat`/`terminal` 别名。
6. **`import.meta.url` 路径陷阱**：rolldown 打包后相对路径用 `../` 而非 `../../`。
7. **`gateway.bind` 是符号名**：必须用 `resolveGatewayBindHost()` 解析为 `127.0.0.1`。
8. **`@lydell/node-pty` 预编译**：Windows 用 ConPTY，spawn command 必须是 `process.execPath`。
9. **TUI 启动耗时**：`openclaw tui` 子进程从 spawn 到连上 Gateway 约 5–10 秒。
10. **旧页 Chat/TUI Toggle（`/chat`⇄`/cli`）**：切走 TUI 时 PTY WS 断开、子进程被杀；切回时重新 spawn（T4 行为不变）。
11. **ChatAgent 页面（`/chatagent`）**：自定义 shell；Chat/TUI 用 `chatAgentViewMode` 同页切换。
12. **ChatAgent TUI 保活（T4.6）**：首次切 TUI 时挂载 `oc-cli-terminal` 并连接；之后 Chat/TUI 仅 CSS hide/show，PTY 保持；切回 TUI 发送 `refresh` control frame，经 PTY bridge 转为 `Ctrl+R`，TUI 执行 `loadHistory()`；**换 sessionKey 时** `cli.ts` 重连 PTY；离开 `/chatagent` tab 时 `disconnectedCallback` 清理。
13. **PTY 子进程鉴权**：浏览器 PTY WS 可用 device token；spawn 的 `openclaw tui --token` 必须用 Gateway `resolvedAuth` 共享密钥（`server-pty.ts`），否则 `gateway token mismatch`、无历史。
14. **会话列表加载**：`/chatagent` 用 `CHAT_SESSIONS_LOAD_OVERRIDES`（`activeMinutes:0`、`configuredAgentsOnly:false`），不用默认 120 分钟过滤。

---

## 建议的下一步（按顺序）

**当前重点：P0 验收 + T5 iframe 嵌入**

| 步骤 | 命令/操作 |
|------|----------|
| 1 | 重启 Gateway（`server-pty.ts` 鉴权修复需重启） |
| 2 | 刷新 `/chatagent`，验证 TUI 历史 + Chat/TUI 保活切换 |
| 3 | 跑 [`CHATAGENT.md` §7](./CHATAGENT.md) P0 验收清单 |
| 4 | T5：basePath / allowedOrigins / iframe 嵌入 |

**补做：** T1.2/T1.3（DataWorks 配置与平台 Key）；T1.6 演示前再补。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-22 | 初稿：基线锁定、任务状态、代码审计要点 |
| 2026-05-22 | 明确本地项目：取消 upstream 同步相关任务 |
| 2026-05-22 | T1 部分完成 |
| 2026-05-25 | 架构升级：T3 PTY Bridge；T3 完成 |
| 2026-05-26 | T4 完成：旧页 Chat/TUI toggle |
| 2026-05-26 | T4.5 完成：`/chatagent` 新页面 |
| 2026-05-26 | T4.7：移动端/会话列表/PTY 鉴权等联调修复 |
| 2026-05-26 | T4.6：ChatAgent Chat/TUI 方案 A 保活；文档同步 |
