# Hub 网站：构建时拉取 + Next.js SSG

Hub 通过 GitHub API 在构建时读取技能数据，生成静态页面。PR 合并触发 Vercel 自动部署。

**Considered Options:**

- **A. 构建时拉取（SSG）** — Next.js `generateStaticParams` 在构建时通过 GitHub API 读取 skills/ 目录，生成静态页面。PR 合并 → Vercel 重新构建 → 页面更新。
- **B. 运行时拉取（SSR）** — 每次访问页面时调 GitHub API。实时但慢，有 rate limit。
- **C. 增量静态再生成（ISR）** — 构建时生成，运行时按需更新。复杂度高。

选择 A 的理由：PR 合并 = 数据更新 = 自动部署 = 页面更新。零运维，数据一致性天然保证。技能数据量小，构建时全量拉取没有性能问题。

**Upload API 端点：**

`POST /api/upload` 作为 Next.js Route Handler 部署在同一应用中。使用维护者 GitHub PAT（存 Vercel 环境变量）创建 PR。

**技术栈确认：**

- Web：Next.js App Router + Tailwind CSS 4（Cohere 设计系统）
- API：Next.js Route Handlers + @octokit/rest + adm-zip
- 部署：Vercel
- 认证：GitHub PAT（存环境变量 `GITHUB_TOKEN`）
