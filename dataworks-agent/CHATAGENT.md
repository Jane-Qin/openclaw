# DataWorks Agent · `/chatagent` 新页面功能梳理

> 本文档描述 **Control UI 新产品页** `/chatagent` 的功能范围与验收标准。  
> 与 [`PLAN.md`](./PLAN.md) 的关系：PLAN 管 MVP 总路线；本文档专讲 **PinchChat 式嵌入对话页** 的 UI/交互规格。  
> **现有 `/chat`、`/cli` 页面保留不动**，新能力在新路由上实现。

**最后更新：** 2026-05-26（T4.6 TUI 保活 + 联调修复）

---

## 1. 页面定位

| 项 | 说明 |
|----|------|
| **路由** | `/chatagent`（可选 query：`?session=<sessionKey>&view=chat\|tui`） |
| **保留页** | `/chat` — OpenClaw 原 Control UI 聊天；`/cli` — 独立 TUI PTY 页（调试/对照） |
| **用途** | 数据中台 iframe 嵌入、对外演示的 **Agent 对话工作台** |
| **架构原则** | **布局与交互重做**；Gateway、会话、模型切换、PTY TUI **复用现有后端与组件** |

### 1.1 为何新开页面

- 不破坏现有 `/chat` 测试与 OpenClaw 默认体验
- 嵌入场景可隐藏 Control/Agent 全局导航，只暴露对话工作台
- 红框标注的交互（会话菜单、顶栏导出、底栏上下文徽章）与旧页布局冲突，独立页更清晰
- 出问题可回退到 `/chat`，风险可控

---

## 2. 整体布局

```
┌────────────────────┬─────────────────────────────────────────────────┐
│ 左：会话栏           │ 中：对话区                                        │
│                    │  顶栏：会话标题          [导出]  [Chat | TUI]  ②  │
│  OpenClaw v2026    │  ─────────────────────────────────────────────  │
│  [+ 新会话]         │  主体：欢迎页 / 消息流  或  TUI 终端（xterm）       │
│                    │  ─────────────────────────────────────────────  │
│  MAIN              │  底栏：[模型▼] [附加] [⚙] 输入框 … [上下文][≡][发送]│
│   · Main Session ⋮ │                                              ③  │
│     └ 重命名/删除 ① │                                                 │
│  AGENTTEST         │                                                 │
│   · agenttest:main │                                                 │
│                    │                                                 │
│  [⚙ 设置]          │                                                 │
└────────────────────┴─────────────────────────────────────────────────┘
```

**三区职责：**

| 区域 | 职责 | 不放什么 |
|------|------|----------|
| **左栏** | 会话列表、新建、重命名、删除 | 模型/agent/thinking 选择 |
| **顶栏** | 当前会话名、导出、Chat/TUI 切换 | 旧页那种 session/agent/model 下拉排 |
| **底栏** | 模型、输入、发送、上下文用量、更多菜单 | TUI 模式下整栏隐藏 |

**embed 模式（T5）：** 宿主 iframe 固定 `src="/openclaw/chatagent?session=..."`；隐藏 global sidebar 的 Control/Agent 导航。

---

## 3. 功能清单（按 UI 区域）

### 3.1 左栏 · 会话面板

| ID | 功能 | 优先级 | 说明 |
|----|------|--------|------|
| L1 | 品牌与版本 | P0 | Logo + 版本号（如 `v2026`，与实际显示一致）+ 连接状态指示 |
| L2 | 折叠侧栏 | P1 | 收窄为图标条，保留新会话入口 |
| L3 | **+ 新会话** | P0 | 复用 `createChatSession` |
| L4 | **分组会话列表** | P0 | 按 agent 分组（如 `MAIN`、`AGENTTEST`）；**不**复用现有 sidebar `renderSidebarSessions`（它只展示最近 5 个），需新建基于 `resolveSessionOptionGroups` 的完整分组面板 |
| L5 | 会话项展示 | P0 | 显示名、相对更新时间、当前选中高亮 |
| L6 | **点击切换会话** | P0 | 复用 `switchChatSession`，URL 同步 `?session=` |
| L7 | **会话 ⋮ 菜单** | P0 | 见 **红框①** |
| L8 | 活跃 run 指示 | P1 | `hasActiveRun` 时显示进行中状态 |
| L9 | 搜索会话 | P1 | 过滤列表（可参考 `views/sessions.ts`） |
| L10 | 筛选 chips | P2 | All / Active / Cron 等 |
| L11 | 底部设置入口 | P2 | 齿轮 → `/config` 或宿主配置 |

#### 红框① · 会话项上下文菜单（P0）

**触发：** 会话项右侧 **⋮**（或右键）。

| 菜单项 | 图标 | 行为 |
|--------|------|------|
| **重命名** | 铅笔 | 弹窗/行内编辑 → `sessions.patch`（`label` 字段） |
| **删除** | 红色垃圾桶 | 确认后 → `sessions.delete`（含 transcript） |

**已有后端/控制器：**

- `ui/src/ui/controllers/sessions.ts` — `patchSessionFields`、`deleteSessionsAndRefresh`
- Gateway RPC：`sessions.patch`、`sessions.delete`

**注意：** 删除当前正在查看的会话后，应自动切到同 agent 的 main 或其它可用会话。

---

### 3.2 顶栏 · Conversation Header

| ID | 功能 | 优先级 | 说明 |
|----|------|--------|------|
| H1 | **当前会话标题** | P0 | 只读文本，如 `agenttest:main`（`resolveSessionDisplayName`） |
| H2 | **Chat / TUI 切换** | P0 | Segmented toggle；页面内 `chatAgentViewMode`，不跳 `/cli` tab。**T4 的 `renderChatTuiToggle()` 不适用**（它用 `state.setTab` 跨 tab 跳转），需新建同页 viewMode 切换 |
| H3 | **导出** | P0 | 见 **红框②** |
| H4 | 连接状态 | P1 | Connected / 断线提示（可选） |

#### 红框② · 顶栏「导出」（P0）

**位置：** 顶栏 **右侧**，与 Chat/TUI toggle 同一行（toggle 可在导出右侧或左侧，以设计稿为准）。

| 项 | 说明 |
|----|------|
| 文案 | 「导出」 |
| 行为 | 导出 **当前会话** 聊天记录为 Markdown |
| 禁用 | 当前会话无消息时 `disabled` |
| 复用 | `exportChatMarkdown`（现于 `ui/src/ui/chat/export.ts`，旧页在底部 `run-controls`） |

**与旧页差异：** 旧 `/chat` 导出在 compose 底栏；`/chatagent` **上移到顶栏**。

#### Chat / TUI 模式（P0）

| 模式 | 主体 | 底栏 compose |
|------|------|--------------|
| **Chat** | 复用 `renderChat`（消息 + 欢迎页 + 底栏输入） | 显示 |
| **TUI** | 复用 `renderCli`（xterm + WS `/tui/pty`） | **隐藏** |

**状态建议：**

```ts
chatAgentViewMode: "chat" | "tui"       // 默认 "chat"
chatAgentTuiEverOpened: boolean         // 首次切 TUI 后为 true，用于懒挂载 PTY
```

**URL（可选）：** `?view=tui` 便于刷新/分享。

**Session 共享：** 两种模式同一 `sessionKey`；TUI 子进程 `openclaw tui --session ...`，与 Chat 历史互通。

#### Chat / TUI 切换生命周期（T4.6 · 方案 A）

| 场景 | 行为 |
|------|------|
| 首次切到 TUI | 挂载 `oc-cli-terminal`，建立 PTY WS + spawn `openclaw tui` |
| 同 session 反复切 Chat ↔ TUI | **保活**：两 pane 同在 DOM，CSS `chatagent-pane--hidden` 隐藏；PTY 不断开 |
| 切回 TUI | 瞬间恢复 xterm 缓冲；`active=true` 时 `fit` + `sendResize` + 主动刷新历史 |
| 左侧换 session | `sessionKey` 变化 → `cli.ts` 重连 PTY（即使当前在 Chat 模式） |
| 离开 `/chatagent` tab | `disconnectedCallback` 清理 WS + PTY 子进程 |

**与旧页 `/chat`⇄`/cli` 差异：** 旧页跨 tab 仍采用 T4「切走断开、切回重连」；仅 `/chatagent` 内切换走保活方案。

**历史同步：** Chat 模式发消息时，后台 TUI 子进程仍连 Gateway，收到 `chat.final` 等事件后会 `loadHistory()`；切回 TUI 时前端还会通过 PTY control frame 主动触发一次 `loadHistory()`，避免事件漏掉或刷新过早导致的不同步。

**实现要点：**

- `app-render.ts`：`chatagent-pane` 双 pane，不用 `showTui ? cli : chat` 互斥卸载
- `cli.ts`：`active` 属性控制可见性；隐藏时不 `cleanup()` WS
- `server-pty.ts`：spawn 子进程用 Gateway `resolvedAuth` 共享密钥，不用 browser device token

**TUI 注意：** 子进程连 Gateway 约 5–10 秒，首次切 TUI 需 loading；保活后再次切回不重连。

---

### 3.3 主体 · 对话内容

#### Chat 模式

| ID | 功能 | 优先级 | 说明 |
|----|------|--------|------|
| B1 | 消息流 | P0 | 复用 `renderChat` 线程渲染 |
| B2 | 欢迎页 | P0 | 复用 `chat-welcome.ts`（助手名、DataWorks 徽章、快捷问题） |
| B3 | 流式输出 | P0 | 现有 Gateway `chat.send` 流 |
| B4 | Markdown / 工具卡片 | P0 | 现有 grouped-render |
| B5 | 工具输出侧栏 | P2 | 现有 chat markdown sidebar（可选） |

#### TUI 模式

| ID | 功能 | 优先级 | 说明 |
|----|------|--------|------|
| T1 | xterm 终端 | P0 | `ui/src/ui/views/cli.ts` → `oc-cli-terminal` |
| T2 | PTY 桥接 | P0 | Gateway `/tui/pty` → spawn `openclaw tui` |
| T3 | resize | P0 | 窗口变化 → `pty.resize` |
| T4 | 键盘输入 | P0 | xterm → WS → PTY stdin |
| T5 | 启动 loading | P0 | 等待 TUI ANSI 输出 |

---

### 3.4 底栏 · Compose（仅 Chat 模式）

| ID | 功能 | 优先级 | 说明 |
|----|------|--------|------|
| C1 | **模型下拉** | P0 | 左侧，如 `gemini-2.5-flash`。**注意：** 现有 `renderChatModelSelect` 在顶栏 content-header，新页面需把模型选择嵌入 compose 区域，需从 `renderChatSessionSelect` 中拆出模型部分 |
| C2 | 附加文件 | P0 | 纸夹「附加」 |
| C3 | 设置 ⚙ | P1 | Talk 选项等（可按 embed 需求隐藏） |
| C4 | 多行输入 | P0 | Enter 发送，Shift+Enter 换行 |
| C5 | **上下文用量** | P0 | 见 **红框③** |
| C6 | **汉堡菜单 ≡** | P0 | 见 **红框③** |
| C7 | 发送 | P0 | 纸飞机按钮 |
| C8 | 停止 | P0 | 生成中显示 Stop |
| C9 | 排队 | P1 | 有 abortable run 时的 Queue |

#### 红框③ · 底栏右侧「上下文 + 汉堡菜单」（P0）

**位置：** compose 区域 **最右侧**，发送按钮左侧。

**上下文用量徽章：**

| 项 | 说明 |
|----|------|
| 文案示例 | `12% 已用上下文 (24.5k / 200k)` |
| 数据 | 当前 session `totalTokens` / `contextTokens`（**复用 `getContextNoticeViewModel()` 数据逻辑**，仅新建紧凑徽章渲染层，不复用 `renderContextNotice` 宽条组件） |
| 形态 | **紧凑徽章** + hover tooltip；非旧页 compose 上方整条 `context-notice` |
| 警告 | 接近上限变色（≥85% 警告，≥90% 可提示 compact） |

**汉堡菜单 ≡：**

| 项 | 说明 |
|----|------|
| 触发 | 三条横线图标，点击展开下拉/弹出 |
| 建议项（P1 可迭代） | 压缩上下文（`/compact`）、清空历史、新会话 |
| 说明 | 导出已在顶栏，≡ 内可不重复 |

**与旧页差异：**

| 能力 | 旧 `/chat` | 新 `/chatagent` |
|------|-----------|-----------------|
| 上下文展示 | compose **上方**整条 `context-notice` | compose **右下**紧凑徽章 |
| 导出 | compose **底栏** `run-controls` | **顶栏** |
| 模型选择 | **顶栏** content-header | **底栏** compose 左侧 |

---

## 4. 与现有系统的关系

### 4.1 三页对照

| 路由 | 保留 | 角色 |
|------|------|------|
| `/chat` | ✅ | OpenClaw 原 Control UI |
| `/cli` | ✅ | 独立 TUI PTY（调试） |
| `/chatagent` | 🆕 | DataWorks 产品嵌入页 |

### 4.2 复用 vs 新建

| 能力 | 策略 |
|------|------|
| Gateway Chat WS | 复用 `GatewayBrowserClient`（`mode: webchat`） |
| PTY TUI | 复用 `server-pty.ts` + `cli.ts` |
| 会话 CRUD | 复用 `controllers/sessions.ts` |
| 模型切换 | 复用 `session-controls.ts` |
| 聊天渲染 | 复用 `views/chat.ts`（通过 `layoutVariant: "chatagent"` 等 props 微调） |
| 布局壳 | **新建** `ui/src/ui/chatagent/*` |
| 左栏会话菜单 UI | **新建** |
| 顶栏导出位置 | **新建**（逻辑复用 export） |
| 底栏上下文徽章 + ≡ | **新建**（数据复用 context-notice） |

### 4.3 建议代码结构

```
ui/src/ui/
├── chatagent/
│   ├── chatagent-layout.ts      # 总布局
│   ├── sessions-panel.ts        # 左栏（含 ⋮ 菜单）
│   ├── conversation-header.ts   # 顶栏（导出 + Chat/TUI）
│   └── compose-extras.ts        # 上下文徽章 + 汉堡菜单
├── chat/
│   ├── session-controls.ts      # 导出 renderChatModelSelect
│   ├── context-notice.ts        # 抽取 compact 用量数据 helper
│   └── build-control-ui-chat-props.ts  # 共享 Chat props 构建
├── views/chat.ts                # layoutVariant 支持
├── views/cli.ts                 # 不变
├── navigation.ts                # 注册 chatagent tab
└── app-render.ts                # chatagent 分支

ui/src/styles/
└── chatagent.css                # 新页样式
```

---

## 5. 状态与路由

### 5.1 页面内状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `tab` | `"chatagent"` | 路由 tab |
| `chatAgentViewMode` | `"chat" \| "tui"` | 主体视图 |
| `chatAgentSessionsCollapsed` | `boolean` | 左栏折叠（P1） |
| `sessionKey` | `string` | 与 Chat/TUI 共享 |
| 会话 ⋮ 菜单 | `{ key, anchor } \| null` | 当前打开的菜单 |

### 5.2 URL 约定

```
/chatagent?session=agent:main:main&view=chat
/chatagent?session=agent:main:main&view=tui
```

- `session` — 与现有 Chat 页一致
- `view` — 可选，`chat`（默认）或 `tui`
- token — 仍走 hash `#token=...` 或宿主 postMessage（T5）

### 5.3 需同步改动的宿主逻辑

| 文件 | 改动要点 |
|------|----------|
| `navigation.ts` | 注册 `/chatagent`；`isChatSurfaceTab()` 含 chatagent |
| `app-settings.ts` | `chatagent` 与 `chat` 同样同步 `?session=`；离开 chat  surface 时 chat 清理策略 |
| `app-gateway.ts` | chatagent 视为 chat surface（sessions reload 等） |
| `app-lifecycle.ts` | chatagent 参与 scroll 等 chat 生命周期 |
| `app-render.ts` | **完全自定义 shell**：新页面不使用现有 `renderShell` 的 sidebar/header 结构，自行渲染左栏+中间区（`shell--chatagent`），避免与旧页全局导航和 content-header 冲突 |

---

## 6. 分期实施

### Phase 1 — 可 demo（P0）

1. 注册 `/chatagent` + 全屏 shell（自定义 shell，不用现有 renderShell 结构）
2. 左栏：新会话 + 基于 `resolveSessionOptionGroups` 的分组列表 + 切换会话
3. **红框①**：会话 ⋮ → 重命名 / 删除
4. 顶栏：会话名 + Chat/TUI（新建 viewMode toggle，不复用 T4 的 tab 跳转）+ **红框② 导出**
5. 主体：Chat / TUI 复用
6. 底栏：模型下拉（从 session-controls 拆出）+ 输入 + 发送 + **红框③ 上下文徽章（复用 getContextNoticeViewModel 数据，新建紧凑渲染）+ ≡ 菜单（≡ 可先占位）**

### Phase 2 — 体验（P1）

1. 左栏搜索、折叠
2. ≡ 菜单完整项（compact、清空历史等）
3. URL 同步 `view`
4. TUI loading / 断线提示
5. 移动端左栏 drawer

### Phase 3 — 视觉（P2）

1. PinchChat 深色精修
2. 筛选 chips、活跃 run 进度
3. embed 默认路由、隐藏 admin

---

## 7. P0 验收清单

- [ ] 访问 `/chatagent` 为 **左会话 + 中对话** 布局，无旧页 content-header 控件排
- [ ] 左栏 **⋮** 可 **重命名**、**删除** 会话
- [ ] 顶栏 **导出** 可下载当前会话 Markdown；无消息时禁用
- [ ] 顶栏 **Chat / TUI** 切换正常；同一 `sessionKey` 历史互通
- [ ] 同 session 反复切 Chat/TUI **不重连** PTY（T4.6 保活）；换 session 才重连
- [ ] Chat 模式底栏有 **模型下拉**，切换生效
- [ ] 底栏右侧显示 **上下文用量**（`x% 已用上下文 (xk / yk)`）
- [ ] 底栏右侧 **≡ 菜单** 可打开（至少占位或含 1 项可用操作）
- [ ] TUI 模式无 compose，终端可对话、`/help`
- [ ] `/chat`、`/cli` 行为与改前一致

---

## 8. 风险与依赖

| 风险 | 应对 |
|------|------|
| TUI 启动慢 | 仅首次切 TUI 慢；保活后切换 instant；loading + 勿过早断 WS |
| TUI 无历史 / token mismatch | spawn 子进程须用 Gateway `resolvedAuth`，见 `server-pty.ts` |
| 删除当前会话 | 自动 fallback 到 main |
| 重名会话标签 | 列表内 disambiguate（现有 session-controls 逻辑） |
| 与旧页样式冲突 | `layoutVariant` + 独立 `chatagent.css` |
| i18n | 中文文案先写 `en.ts` 英文 key，或 DataWorks 阶段仅中文 |

---

## 9. 参考

- 总计划：[`PLAN.md`](./PLAN.md)
- 进度：[`STATUS.md`](./STATUS.md)
- AI 改码地图：[`VIBECODING.md`](./VIBECODING.md)
- PTY 后端：`src/gateway/server-pty.ts`
- 前端 TUI：`ui/src/ui/views/cli.ts`
- 会话 API：`ui/src/ui/controllers/sessions.ts`
- 上下文用量：`ui/src/ui/chat/context-notice.ts`
- 导出：`ui/src/ui/chat/export.ts`

---

## 10. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-05-26 | 初稿：基于 PinchChat 目标布局 + 截图红框①②③ 修正导出/上下文/会话菜单位置 |
| 2026-05-26 | 审查修订7点：去时间估算；L4 明确不复用 sidebar recent 改用 resolveSessionOptionGroups；H2 明确 T4 toggle 不适用需新建 viewMode 切换；C1 模型下拉需从 session-controls 拆出到 compose；C5 上下文徽章复用数据逻辑新建渲染；app-render.ts 改为完全自定义 shell；L1 版本号格式对齐实际显示 |
| 2026-05-26 | T4.6：Chat/TUI 方案 A 保活（双 pane hide/show、`chatAgentTuiEverOpened`、`cli.ts` `active`）；T4.7 联调修复与 PTY 子进程鉴权说明 |
