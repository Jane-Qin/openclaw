# dataworks-agent

这是我们在 **OpenClaw fork 仓库**上的二次开发工作目录，存放 DataWorks Agent 项目的
内部文档、配置样例和 AI 协作上下文。**不修改 OpenClaw 上游目录结构**；实际代码改动
主要在 `ui/`（Control UI），计划与决策写在本目录。

本仓库为**本地独立维护**的 OpenClaw 二开副本，**不配置 upstream、不与官方主线同步**。
`dataworks-agent/` 仅放我们的计划与配置，与仓库其余代码分开管理即可。

## 这是什么？

| 层次 | 说明 |
|------|------|
| **宿主产品** | 数据中台（浏览器端），负责登录、鉴权、页签/iframe |
| **本仓库** | 基于 OpenClaw 代码的**本地 clone / 二开**，独立演进 |
| **我们要交付的** | 嵌入数据中台的 AI 助手：**Chat**（现有 Control UI）+ **CLI**（xterm + TUI 协议） |
| **后端** | 单一 OpenClaw Gateway，平台统一 Key，`tools.deny` 默认关外部工具 |

## 文件清单

| 文件 | 用途 |
|------|------|
| [`PLAN.md`](./PLAN.md) | MVP 开发计划：任务、验收、风险、决策 |
| [`STATUS.md`](./STATUS.md) | **当前进度**与代码库审计（随开发更新） |
| [`VIBECODING.md`](./VIBECODING.md) | AI 上下文地图：改哪些文件、提示词模板 |
| [`openclaw.example.json5`](./openclaw.example.json5) | Gateway 配置样例 |
| [`README.md`](./README.md) | 本文件 |

## 快速开始

1. 读 [`PLAN.md`](./PLAN.md) —— MVP 范围与任务清单。
2. 读 [`STATUS.md`](./STATUS.md) —— 当前做到哪一步。
3. 读 [`VIBECODING.md`](./VIBECODING.md) —— 开 AI 会话前先喂上下文。
4. 复制 [`openclaw.example.json5`](./openclaw.example.json5) → `~/.openclaw/openclaw.json`，
   用环境变量注入 Key，勿把密钥提交进仓库。

## 一句话目标

在数据中台浏览器端嵌入基于 OpenClaw 二开的 AI 助手，支持 **`/chat` ⇄ `/cli`** 同会话切换，
后端单一 Gateway，平台统一 AI Key，外部工具默认全关。**目标 5–7 个工作日跑通 MVP。**

## 本机仓库现状（2026-05-22）

- **工作目录：** `d:\code\openclaw`（本地项目）
- **远程（可选）：** `origin` → 团队 Git 仓库，仅用于备份/协作推送
- **分支：** 当前在 `main`；`dev-dataworks-agent` 待创建
- **基线：** `49e3f8c3ee`（OpenClaw `2026.5.21`）
- **T1 Gateway：** 🟡 T1.1/1.4/1.5 已可对话；**T1.2 配置样例、T1.3 环境变量未做**
- **下一步：** 补 T1.2/T1.3，再 T2 浏览器 `/chat`
- **代码：** `ui/src/ui/views/cli.ts` 尚未实现

## Git 约定（本地项目）

- **不做 upstream 同步** —— 按本仓库需求改 `ui/` 等即可
- `main` —— 稳定线；大特性在 `dev-dataworks-agent` 开发
- `feature/xxx` —— 单任务分支（可选）
- 需要备份时：`git push origin <branch>`

## 法律与合规

- OpenClaw 为 **MIT**，二次开发兼容
- 保留 `LICENSE`、`NOTICE` 等上游文件
- 对外发布注明 "Based on OpenClaw (MIT)"
- 正式版替换 OpenClaw 商标/Logo（见 PLAN P1）

## 联系

- 业务负责人：TBD
- 技术负责人：TBD
- 沟通渠道：TBD
