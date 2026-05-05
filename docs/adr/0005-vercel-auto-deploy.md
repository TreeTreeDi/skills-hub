# PR 合并后通过 Vercel 自动部署

GitHub PR 合并到 main 分支后，Vercel 自动检测变更并重新部署 Web 端。无需额外 webhook 或轮询机制。

选择此方案的理由：Web 端和技能数据在同一仓库，PR 合并 = 数据更新 + 自动部署，零额外配置。数据一致性天然保证（Web 端和技能数据在同一 commit）。如果 Web 端和数据分仓库，则需要 webhook 方案。
