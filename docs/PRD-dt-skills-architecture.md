## Problem Statement

当前 dt-skills（原 Skills Hub / owl-skills）的搜索和上传体验存在三个结构性瓶颈：

1. **搜索速度不可接受**：`/api/search` 每次请求都重新通过 GitHub API 拉取全量技能数据（tree + 逐个 blob），无任何服务端缓存。对于用户来说，搜索响应时间从数百毫秒到数秒不等，且随技能数量增长线性恶化。

2. **无法追踪上传状态**：用户通过 `owl upload` 上传技能包后，仅得到一个 GitHub PR 链接。没有用户系统，"我的上传在哪里？""审核通过了吗？""为什么被拒绝？" 这些产品问题无法回答。上传体验对非技术用户完全不友好。

3. **纯 GitHub 架构的产品天花板**：当前架构以 GitHub 仓库为唯一数据源，Hub 在构建时或运行时直接读取 GitHub。这导致无法做安装统计、热门榜单、评分、实时搜索、审核状态管理等任何产品功能。随着网页端上传/下载功能的推进，这个天花板会越来越紧。

## Solution

引入 **Postgres 数据库 + Prisma ORM** 作为业务层和搜索层，**GitHub OAuth** 作为身份层，**保留 GitHub PR** 作为审核执行层。

核心原则：**GitHub 存储技能内容（真相来源），数据库存储元数据、状态和搜索索引（产品层）。**

同时完成品牌更名：**CLI bin 名从 `owl` 改为 `dt-skills`，产品名统一为 `dt-skills`。**

### 数据架构

```
用户视角：
  搜索技能 ──► 数据库 FTS 查询 ──► <100ms 返回结果（服务端分页）
  上传包   ──► API 创建 PR + 写入 uploads 表 ──► 网页看到"审核中"
  查看状态 ──► /uploads 页面查询 uploads 表 ──► 看到 approved/rejected + 理由
  安装技能 ──► CLI add ──► POST /api/track-install ──► 安装量 +1

管理员视角：
  GitHub PR 审核 ──► Webhook 同步状态到 uploads 表 ──► 用户自动收到更新

数据同步：
  PR 合并 ──► Webhook ──► SyncService 拉取 SKILL.md ──► 写入 packages + skills 表
```

## User Stories

### 搜索体验

1. 作为用户，我能在 Hub 搜索框输入关键词后 200ms 内看到结果，以便流畅地查找技能。
2. 作为用户，我搜索时输入"serch"也能匹配到"search"相关技能，以便不用精确拼写。
3. 作为用户，搜索结果按相关性排序（名称匹配优先于描述匹配），以便最快找到最想要的技能。
4. 作为用户，我能在搜索时按"集成包"或"单技能"分类过滤，以便缩小范围。
5. 作为用户，我能在搜索框输入时实时看到结果（无需按回车），以便快速探索。
6. 作为用户，我能在首页看到技能排行榜（表格形式），按安装量排序，以便快速发现热门技能。
7. 作为用户，我能通过多选技能并一键复制批量安装命令，以便快速安装多个技能。

### 上传与审核

6. 作为技能作者，我执行 `dt-skills upload` 后能在网页上看到该上传的审核状态，以便知道进度。
7. 作为技能作者，当我的上传被拒绝时，我能在网页上看到拒绝理由（来自 GitHub PR review comment），以便修改后重新上传。
8. 作为技能作者，我登录 Hub 后能在"我的上传"页面看到所有历史记录（pending / approved / rejected），以便管理我的技能包。
9. 作为技能作者，我希望上传后收到状态变更通知（至少在当前页面实时更新），以便不用反复刷新。
10. 作为技能作者，我未来能通过网页端直接上传技能包（不依赖 CLI），以便降低使用门槛。

### 审核管理

11. 作为审核者，我能继续在自己熟悉的 GitHub PR 界面中审核技能包（diff、comment、approve），以便不需要学习新工具。
12. 作为审核者，PR 合并后技能自动在 Hub 上架，无需手动同步，以便减少操作步骤。
13. 作为审核者，PR 关闭（未合并）时用户自动收到拒绝通知和理由，以便沟通闭环。

### 浏览与发现

14. 作为用户，我能浏览技能目录并看到每个技能的安装量，以便判断受欢迎程度。
15. 作为用户，我能看到"总榜"、"趋势(24h)"、"热门"三种排行榜，以便从不同维度发现优质技能。
16. 作为用户，我能通过分页浏览技能列表，页面保持流畅，以便浏览大量技能。
16. 作为用户，我能查看技能详情页，阅读 SKILL.md 的完整内容和使用说明。

### 认证与账户

17. 作为用户，我能用 GitHub 账号一键登录 Hub，无需注册新账号，以便快速开始。
18. 作为用户，登录后我能看到自己的 GitHub 头像和用户名，以便确认当前身份。

### 性能与稳定性

19. 作为开发者，搜索 API 的 P95 响应时间应低于 100ms（缓存命中时），以便支撑正常流量。
20. 作为开发者，系统应能优雅处理 GitHub API 速率限制和临时不可用，以便服务稳定。
21. 作为开发者，数据库中的技能数据应在 PR 合并后 1 分钟内同步完成，以便用户看到最新内容。

### 品牌一致性

22. 作为用户，CLI 工具名和网站品牌统一为 `dt-skills`，以便识别和记忆。
23. 作为用户，所有文档中的命令示例统一使用 `dt-skills`（如 `dt-skills upload`、`dt-skills add`）。

## Implementation Decisions

### 模块设计（Deep Modules）

以下四个模块应被设计为**深度模块**——对外暴露简单稳定的接口，内部封装复杂实现细节，便于独立测试和后续演进。

1. **SearchService**
   - 职责：封装所有搜索逻辑，包括关键词查询、排行榜排序、分页。
   - 对外接口：`search(query, tab, page, limit) → PaginatedSearchResult`
   - 内部实现：Postgres `tsvector` 全文索引 + `pg_trgm` 模糊匹配 + 字段权重（name > description > body）+ 安装量子查询（24h / 7d）+ `OFFSET`/`LIMIT` 分页。
   - 为何是深度模块：搜索算法会频繁迭代（调整权重、添加新字段），但调用方接口保持不变。

2. **SyncService**
   - 职责：将 GitHub 仓库中的 SKILL.md 数据同步到数据库。
   - 对外接口：`syncPackage(repo, packageName) → SyncResult`
   - 内部实现：调用 GitHub API 获取 tree → 下载 blob → 解析 frontmatter → upsert packages + skills 表 → 更新 searchVector。
   - 为何是深度模块：GitHub API 调用策略、错误重试、解析逻辑都在内部，调用方不关心数据来源。

3. **UploadService**
   - 职责：封装上传全流程，连接 CLI/网页上传、GitHub PR 创建和数据库记录。
   - 对外接口：`createUpload(user, packagePath, source) → UploadRecord`
   - 内部实现：打包 → 调用 GitHub API 创建 PR → 解析响应获取 prNumber/prUrl → 写入 uploads 表。
   - 为何是深度模块：PR 创建的实现细节、错误处理、回滚逻辑封装在内部。

4. **AuthService**
   - 职责：封装 GitHub OAuth 认证和用户信息管理。
   - 对外接口：`getSession() → UserSession | null`、`requireAuth() → User`
   - 内部实现：NextAuth.js v5 (Auth.js) + GitHub Provider + users 表 upsert。
   - 为何是深度模块：认证框架可能替换，但业务代码的 `requireAuth()` 接口不变。

### 数据库 Schema

五个核心表：

- **users**：GitHub OAuth 用户信息（githubId, githubLogin, avatarUrl）。用户首次登录时自动创建。
- **uploads**：上传记录和审核状态（packageName, prNumber, prUrl, status, reviewComment, userId）。`status` 为 enum：PENDING / REVIEWING / APPROVED / REJECTED。
- **packages**：技能包元数据（name, sourceRepo, description, ownerGithubLogin, skillsCount, installs, syncedAt）。
- **skills**：单个技能元数据（packageId, slug, name, description, tags, category, fileList, skillMdBody, searchVector, installs, syncedAt）。`searchVector` 为 Postgres `tsvector` 类型，配合 GIN 索引加速搜索。
- **installEvents**：安装事件记录（skillId, packageId, createdAt）。每次 CLI 执行 `dt-skills add` 成功后写入一条。复合索引 `(skillId, createdAt)` 支撑 24h / 7d 安装量统计。

### 数据同步策略

- **初始填充**：首次部署时通过脚本或 API 调用 SyncService 全量同步现有技能数据。
- **增量同步**：GitHub Webhook 监听 `pull_request.closed` 事件。
  - `merged = true`：调用 SyncService 同步该 package，更新 uploads.status = APPROVED。
  - `merged = false`：更新 uploads.status = REJECTED，同步 PR review comments 作为 reviewComment。
- **兜底同步**：每 15 分钟或每小时通过 cron job（Vercel Cron）做一次轻量同步，校验数据一致性。

### 搜索技术方案

- 使用 Postgres 内置全文搜索（`tsvector` + `tsquery`），无需引入外部搜索引擎。
- 模糊匹配使用 `pg_trgm` 扩展的 `similarity()` 函数，支持拼写容错。
- 字段权重：name（A）> description（B）> skillMdBody（C），通过 `setweight()` 在同步时赋值。
- 排序维度（三种排行榜 Tab）：
  - **总榜**：按 `skills.installs`（总安装量）降序。
  - **趋势(24h)**：按近 24 小时内 `installEvents` 数量降序。
  - **热门**：按近 7 天内 `installEvents` 数量降序。
- 搜索模式下（有 keyword）：先按全文搜索排名（`ts_rank`）降序，再按总安装量降序。
- 分页：服务端分页，每页默认 20 条，通过 `page` / `limit` 参数控制。

### 认证方案

- 使用 NextAuth.js v5（Auth.js）+ GitHub Provider。
- 无需自建注册/密码系统，完全复用 GitHub 身份。
- CLI `dt-skills upload` 从 `GITHUB_TOKEN` 提取 `githubLogin`，API 端点通过该字段关联到 users 表（如果用户尚未网页登录，先创建 users 记录）。
- 会话使用 JWT 策略（Serverless 环境下无需数据库会话表）。

### API 契约

- `GET /api/search?q=keyword&tab=all|trending|hot&page=1&limit=20`：查询数据库返回技能列表。服务端分页，响应包含 items, total, page, pageSize。`tab` 控制排序维度（总榜/趋势/热门）。
- `POST /api/track-install`：CLI 安装成功后调用，记录安装事件。Body: `{ skillName, packageName }`。写入 `installEvents` 表并递增对应 `skills.installs` 和 `packages.installs`。
- `GET /api/uploads`：返回当前登录用户的上传历史。需要认证。
- `POST /api/webhook/github`：接收 GitHub Webhook，更新 uploads 和同步 skills 数据。需验证 webhook signature。
- `POST /api/upload`（现有）：扩展为同时写入 uploads 表并关联 user。

### 品牌更名范围

- CLI bin 名：`owl` → `dt-skills`（`package.json` bin 字段）。
- 产品名称：所有用户可见的"Skills Hub" / "owl-skills" 文案统一改为 `dt-skills`。
- 命令文档：`owl upload` → `dt-skills upload`，`owl add` → `dt-skills add`，以此类推。
- 代码中的常量、环境变量前缀、注释中的品牌名同步更新。
- **不更改目录名**（`tools/owl-skills/` 保持原样，减少无意义的文件移动）。

### UI 设计决策

- **全站中文**：所有用户可见文案使用中文。标题、按钮、标签、空状态、提示全部中文化。
- **Hero 重构**：标题从 "Skills Hub" 改为 "DTSKILLS" + "开放 Agent 技能生态"。CommandBlock 与 AgentMarquee 合并为一个圆角 command-bar 卡片（白色背景、圆角 16px、带边框），左侧展示可复制命令，右侧展示支持的 Agent 平台图标。
- **列表展示从卡片网格改为表格行**：
  - 表头：多选 checkbox、排名、技能（名称 + 所属仓库 + 标签）、安装量。
  - 每行可点击跳转详情，hover 背景变化。
  - 支持全选/多选，批量复制安装命令（`dt-skills add <packageName>`）。
  - 底部服务端分页控件。
- **分类筛选从 Chip 改为 Tab**：总榜 / 趋势(24h) / 热门。点击切换排序维度，同步 URL query。
- **保留 AgentMarquee**：无限循环滚动动画保留，但样式融入 command-bar 卡片。

### 安装量统计方案

- CLI 执行 `dt-skills add <packageName>` 成功后，向 `POST /api/track-install` 发送一条记录。
- 服务端写入 `installEvents` 表（skillId, packageId, createdAt）。
- 同时原子递增对应 `skills.installs` 和 `packages.installs`（避免每次查询 COUNT）。
- 趋势(24h) 和 热门(7d) 通过查询 `installEvents` 的 COUNT 按时间窗口聚合排序，数据量小（初期）时直接子查询即可。

### 分页方案

- 服务端分页，默认每页 20 条。
- `GET /api/search` 接收 `page`（从 1 开始）和 `limit`（最大 100）。
- 响应包含 `items`, `total`, `page`, `pageSize`, `totalPages`。
- 首页 ISR 保留，但技能表格区域通过 Client Component 异步加载数据（或页面改为 SSR + 数据库查询）。

### 缓存策略

- 数据层不再依赖 Next.js `unstable_cache` 或内存缓存，因为数据库查询本身已足够快（索引命中时 <10ms）。
- Next.js 页面级 ISR 仍然保留（1 小时），用于首页静态渲染。
- `/api/search` 作为动态路由，每次直接查数据库，通过连接池和索引保证性能。

## Testing Decisions

### 测试原则

- **只测试外部行为，不测试实现细节**。例如测试 SearchService 的 `search()` 接口在给定查询词时返回正确结果，而不是测试它是否使用了 `tsvector`。
- **模块独立测试**。四个深度模块（SearchService, SyncService, UploadService, AuthService）应在隔离环境中测试，通过注入 mock 的依赖（如 mock GitHub client、mock database）来避免外部调用。

### 需要测试的模块

1. **SearchService**
   - 关键词匹配（精确、前缀、错别字）
   - 排行榜排序（总榜 / 趋势(24h) / 热门）
   - 分页边界（第一页、中间页、最后一页、空页）
   - 搜索 + 排行榜组合查询
   - 空结果处理
   - 测试方式：在测试数据库中预置技能数据和 installEvents，执行查询并断言结果集和分页元数据。

2. **SyncService**
   - 从 GitHub API 响应正确解析 SKILL.md
   - upsert 逻辑（新增、更新、删除技能）
   - searchVector 构建正确
   - 错误处理（GitHub API 失败、解析失败）
   - 测试方式：mock GitHub client 返回固定 tree/blob 数据，验证数据库最终状态。

3. **UploadService**
   - 上传成功后 uploads 表正确写入
   - 关联到正确的 user
   - PR 创建失败时的回滚/错误处理
   - 测试方式：mock GitHub API，验证数据库记录和返回值。

4. **AuthService / OAuth 路由**
   - GitHub OAuth 回调正确处理
   - 新用户自动创建
   - 已有用户更新信息
   - 未认证访问受保护路由的拦截
   - 测试方式：mock GitHub OAuth token 响应，验证 session 和 users 表。

5. **Webhook Handler**
   - PR merged 事件正确更新 uploads 和触发同步
   - PR closed (rejected) 事件正确记录拒绝状态
   - Signature 验证失败时拒绝请求
   - 测试方式：构造伪造的 GitHub webhook payload，验证数据库状态变化。

6. **Track Install API**
   - 正确记录 installEvents 并递增 skills.installs
   - 重复调用不重复计数（同一客户端短时间内）
   - 无效 skillName 返回 404
   - 测试方式：mock CLI 请求，验证数据库 installEvents 和 skills.installs 变化。

### 已有测试参考

- `apps/website/app/api/search/route.test.ts`：现有搜索 API 测试，可作为新搜索 API 测试的模板。
- `apps/website/app/lib/skills.test.ts`：现有数据加载测试，可作为 SyncService 测试的参考。
- `tools/owl-skills/upload-api.test.ts`：现有上传 API 测试，需扩展为验证 uploads 表写入。

## Out of Scope

- **自建审核界面**：继续使用 GitHub PR 作为审核界面，不在 Hub 内开发逐行 diff 或 review comment 功能。
- **独立账号注册系统**：仅支持 GitHub OAuth，不支持邮箱/密码注册、手机号登录等。
- **支付与商业化**：不支持付费技能、订阅、打赏等。
- **多语言支持**：仅中文和英文，不扩展其他语言。
- **技能版本管理**：不支持技能的多版本共存、版本回滚、语义化版本控制。
- **实时通知（WebSocket/SSE）**：上传状态变更通过页面刷新或轮询获取，不引入实时推送。
- **邮件/短信通知**：审核状态变更仅在网页端展示，不发送邮件或短信。
- **CLI 功能重写**：`dt-skills` CLI 保留现有全部能力（add, remove, list, find, sync 等），仅修改 bin 名和与上传 API 的交互（增加 user 关联）。

## Further Notes

### 与现有 ADR 的关系

- **ADR-0002（代理 PR 上传流程）**：继续保留。UploadService 的底层仍然是"CLI → API → GitHub PR"，只是在 API 层增加了数据库写入。
- **ADR-0009（构建时拉取 + SSG）**：部分调整。首页仍可用 SSG，但搜索和上传状态页面改为运行时数据库查询。GitHub 不再是唯一的"实时"数据源，而是内容的真相来源，数据库是产品的服务层。

### 数据库选型

- **使用 Vercel Postgres**：与现有 Vercel 部署同平台，集成简单。Hobby 版 256MB 存储对当前数据量（技能数 <1000）完全够用，未来可通过升级 plan 扩展。

### 迁移路径

1. 先在开发环境部署数据库 + Prisma，编写 SyncService 脚本将现有 GitHub 技能数据导入。
2. 验证搜索 API 性能达标后，逐步切线上流量。
3. uploads 表和用户系统上线后，CLI 上传开始同时写数据库。
4. Webhook 配置完成后，PR 审核状态自动同步。
5. 确认稳定后，废弃纯 GitHub API 的搜索路径。

### 性能目标

- 搜索 API P95 < 100ms（数据库索引命中）
- 首页加载时间不变（ISR 1 小时）
- /uploads 页面加载 < 200ms
- Webhook 处理 < 5s（PR 合并到数据库更新）
