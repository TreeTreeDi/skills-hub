# CLI Source Parser：保留原版能力 + 增量添加 hub-name

owl-skills 的 source-parser 基于 vercel-labs/skills 原版完整保留，未做任何删减。所有原版支持的解析类型继续工作：GitHub URL、GitLab URL、Git SSH、well-known URL、source aliases、fragment ref（`#branch@skill-filter`）等。

唯一增量变化是添加了 **hub-name** 作为新的解析类型。

**Considered Options:**

- **A. 完整保留原版 + 添加 hub-name** — 保留所有现有解析能力，将 hub-name 作为 fallback 插入到 `well-known` 之后、`git` 之前。用户输入简短名称时自动解析到配置的默认仓库。
- **B. 简化后重新添加** — 先砍掉再按需加回。成本高且不必要，因为原版代码已经稳定。

选择 A 的理由：vercel-labs/skills 的 source-parser 经过大量实际使用验证，支持 edge cases（GitLab subgroups、SSH URL、fragment refs 等）。保留全部能力没有维护成本，且未来用户可能确实需要这些能力。hub-name 作为增量添加，不影响任何现有路径。

**hub-name 解析逻辑：**

输入 `owl add hello` → `parseSource("hello")` 识别为 `{ type: 'hub-name', name: 'hello' }` → `resolveHubName("hello")` 读取 `~/.dt-skills/config.json` 中的 `defaultRepo` → 返回 `{ type: 'github', url: 'https://github.com/{defaultRepo}.git', subpath: 'skills/hello' }` → 后续流程与 GitHub shorthand 完全一致。

**hub-name 的识别规则：**

- 不含 `/` 或 `:`（排除路径和 URL）
- 不以 `.` 开头（排除本地隐藏路径）
- 只含字母、数字、连字符、点、下划线
- 示例：`hello`、`code-review`、`my.skill_pack`

**未改变的原版能力（全部保留）：**

- GitHub URL（`https://github.com/owner/repo`）
- GitLab URL（含 subgroups）
- Git SSH URL（`git@github.com:owner/repo.git`）
- well-known URL（`/.well-known/agent-skills/`）
- Source aliases（`coinbase/agentWallet` → `coinbase/agentic-wallet-skills`）
- Fragment ref（`owner/repo#branch@skill-filter`）
- `github:` / `gitlab:` prefix shorthand

**CLI 改动：**

- 包名：`skills` → `owl-skills`
- Bin name：`skills` → `owl`
- 新增配置文件：`~/.dt-skills/config.json`，存 `defaultRepo` 字段
- 新增命令：`owl upload`
- 品牌：ASCII logo 从 SKILLS 改为 OWL
