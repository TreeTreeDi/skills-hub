# 上传流程：CLI → API 代理 → GitHub PR

用户通过 CLI 上传技能包，API 代理服务器用维护者的 GitHub token 创建 PR，用户无需 GitHub 账号。

**Considered Options:**

- **A. GitHub PAT 直推** — 用户需要 repo write 权限，门槛高。
- **B. PR 模式（用户 fork）** — 用户需要 GitHub 账号和 fork 操作，流程长。
- **C. 代理服务器 + PR** — CLI 发送到 API，API 用维护者 token 创建 PR。用户零门槛。
- **D. GitHub App** — 最规范但实现复杂。

选择 C 的理由：目标是"所有人都能上传"，代理模式让用户无需 GitHub 账号。CLI 自动读取 git user.name/email 记录上传者信息。PR 提供审核流程，防止垃圾内容。
