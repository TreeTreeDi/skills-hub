# 上传时包名自动推断 + 唯一性检查

上传命令自动从文件夹名推断包名，通过 GitHub API 检查唯一性，拒绝无效 SKILL.md。

**Considered Options:**

- **A. 用户手动指定包名** — `owl upload ./my-skills --name demo`。灵活但繁琐。
- **B. 自动推断包名** — `owl upload ./my-skills`，包名 = "my-skills"。简单直接。
- **C. 自动推断 + 允许覆盖** — 默认自动推断，可选 `--name` 覆盖。

选择 B 的理由：减少用户输入，文件夹名就是包名。当前阶段不需要覆盖能力。

**上传流程：**

```
owl upload ./my-skills
  → 包名 = "my-skills"（从文件夹名推断）
  → 验证 SKILL.md 格式（name + description 必填）
  → 失败 → 拒绝，显示错误信息
  → 成功 → ZIP 打包
  → POST /api/upload { packageName, file, uploaderName, uploaderEmail }
  → 后端检查 skills/my-skills/ 是否已存在（GitHub API contents endpoint）
  → 已存在 → 返回错误 "包名 my-skills 已存在"
  → 不存在 → 创建分支 → 推送文件 → 创建 PR → 返回 PR URL
```

**包名唯一性检查：**

使用 GitHub API `GET /repos/{owner}/{repo}/contents/skills/{packageName}` 检查目录是否已存在。返回 200 = 已存在，返回 404 = 可用。不需要 clone 整个仓库。

**SKILL.md 验证规则：**

- frontmatter 必须包含 `name`（string）和 `description`（string）
- 格式不正确 → 拒绝上传，显示具体错误

**不做：**

- 不支持分类和标签（后续迭代）
- 不支持 ZIP 文件输入（只支持文件夹路径）
- 不支持同名覆盖
