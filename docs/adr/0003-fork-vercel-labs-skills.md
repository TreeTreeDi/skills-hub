# CLI 完整 fork vercel-labs/skills，保留全部能力

owl-skills CLI 基于 vercel-labs/skills 完整 fork，保留所有原版能力（38 种 agent 类型、交互式 UI、blob 安装、well-known providers、telemetry 等），只在其上做增量添加。

**Considered Options:**

- **A. 完整 fork** — 保留 vercel-labs/skills 的全部 38 个 agent 支持、source-parser、交互式 UI（@clack/prompts）、search-multiselect、lock 文件、telemetry、well-known providers 等。在此基础上添加 upload 命令和 hub-name 解析。
- **B. 精简 fork** — 只保留 add/remove/list，砍掉 find/update/sync/init/telemetry 等。减少代码量，但丢失原版能力。
- **C. 从零写** — 只实现 upload 和 hub-name，其他能力后续再加。

选择 A 的理由：

1. vercel-labs/skills 已经解决了 SKILL.md 发现、frontmatter 解析、多 agent 适配、交互式选择等核心问题，代码经过大量实际使用验证。
2. 用户最终决策是"先不砍掉，全部保留"，保留原版全部命令（add、remove、list、find、update、init、sync、experimental_install）对 CLI 用户更友好。
3. 增量添加（upload + hub-name）的风险远低于重写核心安装逻辑。

**增量改动：**

- 品牌：包名 `skills` → `owl-skills`，bin name `skills` → `owl`
- 新增命令：`owl upload`（上传技能到 Hub）
- 新增 source 类型：hub-name（`owl add hello` 自动解析到默认仓库）
- 新增配置：`~/.owl-skills/config.json`，存 `defaultRepo`
- 品牌标识：ASCII logo 从 SKILLS 改为 OWL
