# GitHub 交互：接口注入 + 适配器拆分

上传流水线中与 GitHub 的交互通过窄接口 (`GitHubClient`) 注入，Octokit 实现作为独立适配器。

**Considered Options:**

- **A. 直接依赖 Octokit** — `createUploadPR` 内部 `new Octokit()`，读环境变量。简单，但不可测（需要 mock 整个 Octokit 或操作环境变量）。
- **B. 注入 Octokit 实例** — 把 `Octokit` 实例作为参数传入。可测，但接口太宽（Octokit 有几百个方法，测试时需要 mock 用不到的部分）。
- **C. 窄接口 + 适配器** — 定义只包含 6 个方法的 `GitHubClient` 接口，`github.ts` 只依赖接口，`github-octokit.ts` 提供 Octokit 实现。可测，接口精确，依赖方向单一。

选择 C 的理由：接口宽度 = 测试负担。6 个方法的接口意味着 mock 只需实现 6 个函数。`github.ts` 不 import `@octokit/rest`，业务逻辑和 HTTP 客户端完全解耦。后续扩展（如加评论、打标签）只需在接口上加方法，不影响已有测试。

**结构：**

```
upload.ts → github.ts (接口 + 业务逻辑)
                ↑
         github-octokit.ts (Octokit 适配器)
```
