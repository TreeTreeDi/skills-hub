# PRD: Skills Hub — AI Agent 技能发现与安装平台

## Problem Statement

AI agent 的技能（skills）分散在各个 GitHub 仓库中，没有统一的发现和安装入口。用户需要手动查找仓库、理解目录结构、复制文件到 agent 的技能目录。上传分享技能的流程也没有标准化工具，门槛高、效率低。

## Solution

构建一个包含 Web 端和 CLI 的技能平台：

- **Web 端（Hub）**：浏览、搜索、查看技能详情，获取安装命令
- **CLI（owl-skills）**：一行命令上传技能包到平台，一行命令安装技能到本地 agent
- **数据流**：技能存储在 GitHub 仓库 → Web 端索引展示 → CLI 上传/安装

## User Stories

1. 作为技能使用者，我想在 Hub 首页浏览所有可用技能，以便发现对我有用的技能
2. 作为技能使用者，我想按关键词搜索技能，以便快速找到目标技能
3. 作为技能使用者，我想按分类筛选技能（前端、后端、AI 等），以便缩小查找范围
4. 作为技能使用者，我想查看单个技能的详情页，以便了解技能的功能和使用方式
5. 作为技能使用者，我想在详情页看到 SKILL.md 的完整渲染内容，以便理解技能的指令
6. 作为技能使用者，我想在详情页看到技能的文件列表，以便了解技能包含哪些资源
7. 作为技能使用者，我想一键复制安装命令，以便快速安装技能到本地
8. 作为技能使用者，我想通过 `owl add <source>` 安装技能，以便自动完成发现-选择-安装流程
9. 作为技能使用者，我想在安装时选择要装到哪个 agent（Claude Code、Cursor 等），以便适配我的开发环境
10. 作为技能使用者，我想安装单个技能而非整个包，以便只装我需要的部分
11. 作为技能使用者，我想查看已安装的技能列表，以便管理本地技能
12. 作为技能贡献者，我想通过 `owl upload ./my-package` 上传技能包，以便分享给其他人
13. 作为技能贡献者，我想 CLI 自动读取我的 git 名字和邮箱，以便上传时无需额外输入身份信息
14. 作为技能贡献者，我想 CLI 自动验证 SKILL.md 格式，以便上传前发现格式问题
15. 作为技能贡献者，我想上传后获得 PR 链接，以便跟踪审核进度
16. 作为技能贡献者，我想上传时包名从文件夹名自动推断，以便减少输入（分类和标签暂不做）
17. 作为技能贡献者，我想通过文件夹路径上传，以便直接分享本地开发中的技能
18. ~~作为技能贡献者，我想通过 ZIP 文件上传~~（暂不做，只支持文件夹路径）
19. 作为平台维护者，我想所有上传通过 PR 审核，以便控制技能质量
20. 作为平台维护者，我想 PR 描述中包含上传者信息，以便追溯来源
21. 作为平台维护者，我想 PR 合并后 Hub 自动更新，以便无需手动操作
22. 作为平台访客，我想 Hub 首页加载速度快，以便有良好的第一印象
23. 作为平台访客，我想 Hub 在移动端也能正常使用，以便在手机上浏览技能
24. 作为技能使用者，我想在详情页看到同包下的其他技能推荐，以便发现相关技能
25. 作为技能使用者，我想看到每个技能的文件数量和大小，以便评估技能的复杂度
26. 作为 CLI 用户，我想 `owl add` 支持 GitHub shorthand（`owner/repo`），以便快速安装
27. 作为 CLI 用户，我想 `owl add` 支持本地路径，以便开发测试时灵活指定来源（完整 URL 暂不做）
28. 作为 CLI 用户，我想安装时看到交互式选择界面（类似 fzf），以便直观地选择技能和 agent

## Implementation Decisions

### 架构

- Monorepo 结构：`apps/website`（Next.js）+ `tools/`（CLI fork 独立仓库）+ `packages/utils`
- 技能数据存储在 GitHub 仓库的 `skills/` 目录下，每个子目录为一个 Package
- Web 端通过 GitHub API 在构建时读取技能数据，Vercel 自动部署
- CLI 独立仓库（owl-skills），基于 vercel-labs/skills fork 改造，bin name: `owl`

### Web 端模块

- **首页**：技能列表、搜索栏、分类筛选、排序（stars/recent）
- **详情页**：SKILL.md 渲染、文件列表、安装命令、相关技能推荐
- **API Route（/api/upload）**：接收 ZIP + 元数据 → 解压验证 → 创建 GitHub 分支 → 推送文件 → 创建 PR
- **Design System**：Cohere 设计系统通过 Tailwind CSS theme 实现（颜色、字体、圆角、间距 tokens）

### CLI 模块（owl-skills，bin name: `owl`）

基于 vercel-labs/skills fork 改造（ADR-0007）。

**保留的命令：**

- **add 命令**：`owl add <package>` → 解析包名 → clone 仓库 → discover → 交互式选择 → 安装到 agent 目录
- **remove 命令**：移除已安装技能
- **list 命令**：`owl list` 列出已安装技能
- **find 命令**：`owl find` 搜索可用技能
- **update 命令**：更新已安装技能
- **init 命令**：初始化新技能目录

**新增的命令：**

- **upload 命令**：`owl upload ./my-skills` → 自动推断包名 → 验证 SKILL.md → 打包 ZIP → POST 到 Hub API → 返回 PR URL（ADR-0008）

**Source Parser 简化（ADR-0007）：**

- 只保留三种解析类型：hub-name（包名）、github-shorthand（owner/repo）、local（本地路径）
- `owl add demo` → 读取 `~/.owl-skills/config.json` 的 `defaultRepo` → 拼接为 `defaultRepo/skills/demo` → clone → install
- 删除：GitLab 支持、well-known URL、source aliases、fragment ref、telemetry

**配置文件：** `~/.owl-skills/config.json`，存 `defaultRepo` 字段（默认值硬编码，用户可覆盖）

### API 契约

- `POST /api/upload`：multipart/form-data，字段包括 `file`（ZIP）、`packageName`、`uploaderName`、`uploaderEmail`、`category`、`tags`
- 响应：`{ prUrl: string, skills: Array<{ name, description }> }`
- 错误：`{ error: string, details?: string }`

### GitHub 集成

- 服务端使用 Octokit，持维护者 GitHub token
- 上传创建分支 `upload/{packageName}-{timestamp}`，推送文件后创建 PR
- PR 标题：`📦 New Package: {packageName}`
- PR 描述包含：上传者信息、技能列表、分类、时间戳

### 技术栈

- Web：Next.js 15 App Router + Tailwind CSS 4 + Vitest
- CLI：Node.js + @clack/prompts + picocolors + yaml + simple-git
- API：Next.js Route Handlers + @octokit/rest + adm-zip
- 部署：Vercel（Web）+ npm（CLI）
- 工具链：pnpm workspace + Vite+（utils build/lint）

## 实现顺序

1. **创建 GitHub 技能数据仓库** — 建立仓库结构，放入示例包（单技能包 + 多技能包），验证 SKILL.md 格式
2. **Fork CLI（owl-skills）** — Fork vercel-labs/skills，改包名/bin name，简化 source-parser，配置默认仓库
3. **CLI upload 命令** — 实现 upload 流程：目录验证 → SKILL.md 格式校验 → ZIP 打包 → 调 Hub API
4. **Hub 网站** — Next.js SSG 首页（包列表）+ 详情页（SKILL.md 渲染）+ /api/upload Route Handler

## Testing Decisions

### 测试原则

- 只测外部行为，不测实现细节
- 每个 deep module 有独立的单元测试
- API route 用集成测试验证完整流程

### 需要测试的模块

- **SKILL.md 解析器**（packages/utils）：frontmatter 解析、格式验证、边界情况
- **upload 命令**（CLI）：目录验证、ZIP 打包、API 通信
- **API upload route**：ZIP 解压、文件验证、PR 创建（mock GitHub API）
- **Design System 组件**：渲染正确性、响应式行为

### 不需要测试的部分

- Next.js 页面渲染（通过 E2E 或手动验证）
- vercel-labs/skills fork 的已有逻辑（上游已有测试）
- GitHub API 本身的正确性

## Out of Scope

- 用户认证系统（当前无需登录，用 git 身份即可）
- 技能评分/评论系统
- 技能版本管理（后续迭代）
- 多仓库支持（当前只支持单仓库）
- Windows/Linux CLI 支持（当前只支持 macOS）
- 技能自动同步/更新检测
- 管理后台（审核通过 GitHub PR 界面完成）

## Further Notes

- Cohere 设计系统的专有字体（CohereText、Unica77）需要使用文档中的 fallback 字体
- vercel-labs/skills fork 的工作在独立仓库进行，不在此 monorepo 中
- 技能数据仓库的结构需要在实现前创建好初始目录
