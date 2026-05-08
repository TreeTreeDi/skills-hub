# 上传时包名自动推断 + 唯一性检查 + 冲突处理

上传命令自动从文件夹名推断包名，通过 GitHub API 检查唯一性，冲突时提供交互式重命名。

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
  → 成功 → 预检：GET /api/upload/check?packageName=my-skills
  → 已存在 → 交互式提示：
      Package "my-skills" already exists.
      [ ] Rename and create new
      [ ] Cancel
    → 选择 Rename → 用户输入新包名 → 再次预检 → 通过则继续
    → 选择 Cancel → 退出
  → 不存在 → 确认上传 → ZIP 打包
  → POST /api/upload { packageName, file, uploaderName, uploaderEmail }
  → 后端检查 skills/my-skills/ 是否已存在（GitHub API contents endpoint，兜底校验）
  → 已存在 → 返回 409 "Package already exists. Use owl upload and choose Rename..."
  → 不存在 → 创建分支 → 推送文件 → 创建 PR → 返回 PR URL
```

**包名唯一性检查：**

使用 GitHub API `GET /repos/{owner}/{repo}/contents/skills/{packageName}` 检查目录是否已存在。返回 200 = 已存在，返回 404 = 可用。不需要 clone 整个仓库。

**冲突处理决策：**

预检端点 `GET /api/upload/check?packageName=xxx` 在 CLI 打包前调用，避免无谓的 ZIP 创建和网络传输。

冲突时只支持 **Rename and create new**，不支持 Update existing。理由：

- 更新现有包涉及增量文件管理（哪些删除、哪些新增），复杂度高
- 当前阶段先只增/改，删除语义留到后续 issue 决定
- 409 兜底校验保留，但正常流程通过预检避免了 409 场景

**不做：**

- 不支持分类和标签（后续迭代）
- 不支持 ZIP 文件输入（只支持文件夹路径）
- 不支持同名覆盖/更新（后续 issue）
