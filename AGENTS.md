<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

@DESIGN.md
@CONTEXT.md
@docs

## Documentation Wiki

| 文档                                 | 作用                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| [PRD](docs/PRD-skills-hub.md)        | 产品需求：功能定义、API 契约、Out of Scope                 |
| [使用指南](docs/owl-skills-guide.md) | 面向开发者的完整使用教程（含 CLI 截图位置）                |
| [CLI 发布手册](docs/publish-cli.md)  | `npm publish` 步骤、常见问题、版本管理                     |
| [ADR 目录](docs/adr/)                | 9 条架构决策：存储方式、PR 代理流程、fork 策略、技术选型等 |
| [DESIGN.md](DESIGN.md)               | Cohere 设计系统：颜色、排版、组件、断点                    |
| [CONTEXT.md](CONTEXT.md)             | 领域语言：Skill、Package、Upload、Hub 等术语定义           |
