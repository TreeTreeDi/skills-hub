# Web 端使用 Next.js，monorepo 中与 Vite+ 共存

Web 端（apps/website）使用 Next.js App Router + Tailwind CSS，CLI 和 utils 包继续使用 Vite+ 工具链。两者通过 pnpm workspace 共存。

**Considered Options:**

- **A. Next.js + Vite+ 混合** — Next.js 独立运行 next dev/build，Vite+ 管理其他包。
- **B. 全部换成标准工具链** — 放弃 Vite+，用 turborepo 管理。
- **C. 保留 Vite+，放弃 Next.js** — 用 Vite + React Router 替代。

选择 A 的理由：需要 Next.js 的 Route Handlers 处理 API（上传代理、GitHub PR 创建），同时 Vite+ 工具链为 CLI 和 utils 包提供了优秀的 build/lint/test 体验。两者互不冲突。
