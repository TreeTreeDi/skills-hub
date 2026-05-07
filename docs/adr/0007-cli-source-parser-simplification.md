# CLI Source Parser 简化：单一仓库、三种解析类型

Fork vercel-labs/skills 后大幅简化 source-parser，移除多平台支持，只保留三种解析类型。

**Considered Options:**

- **A. 完整保留 vercel-labs/skills 的 source-parser** — 支持 GitHub、GitLab、well-known URL、SSH、fragment ref 等。功能全但复杂度高，大部分用不到。
- **B. 简化为三种类型** — 只保留 hub-name（包名）、github-shorthand（owner/repo）、local（本地路径）。砍掉 GitLab、well-known、source aliases、fragment ref、telemetry。
- **C. 只保留 hub-name** — 最激进，所有输入都走 Hub 名字解析。灵活性差，开发调试不方便。

选择 B 的理由：源头只有一个 GitHub 仓库，不需要 GitLab 和 well-known 支持。保留 github-shorthand 作为开发调试的兜底路径。保留 local 用于本地测试。telemetry 不需要收集。

**解析优先级：**

```
1. 本地路径（./xxx, ../xxx, /xxx） → { type: 'local' }
2. owner/repo 格式               → { type: 'github-shorthand' }
3. 其他                           → { type: 'hub-name', name: input }
```

**hub-name 解析逻辑：**

输入 `owl add demo` → 读取 `~/.owl-skills/config.json` 中的 `defaultRepo` → 拼接为 `defaultRepo/skills/demo` → clone → install。

**删除的能力：**

- GitLab URL 和 gitlab: prefix
- Git SSH URL（git@...）
- well-known URL（/.well-known/agent-skills/）
- Source aliases（硬编码的 repo 别名映射）
- Fragment ref 语法（#branch@skill-filter）
- Telemetry 模块

**其他 CLI 改动：**

- 包名：`skills` → `owl-skills`
- Bin name：`skills` → `owl`
- 配置文件：`~/.owl-skills/config.json`，存 `defaultRepo` 字段
