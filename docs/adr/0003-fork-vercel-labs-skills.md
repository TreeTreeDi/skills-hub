# CLI 基于 vercel-labs/skills fork 改造

owl-skills CLI 基于 vercel-labs/skills 直接 fork，保留现有能力（add/find/list），新增 upload 命令。

**Considered Options:**

- **A. Fork 改造** — 保留 vercel-labs/skills 的 50+ agent 支持、source-parser、交互式 UI，只加 upload。
- **B. 从零写** — 只实现 upload，其他能力后续再加。

选择 A 的理由：vercel-labs/skills 已经解决了 SKILL.md 发现、frontmatter 解析、多 agent 适配等核心问题。Fork 可以直接复用这些能力，只需新增 upload 命令和与 Hub API 的集成。
