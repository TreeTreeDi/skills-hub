# Skills Hub

Skills Hub 是一个 AI agent 技能的发现和安装平台。技能以 SKILL.md 文件为核心，存储在 GitHub 仓库中，用户通过 CLI 工具上传和安装，通过 Web 端浏览和搜索。

## Language

**Skill（技能）**：
一个包含 `SKILL.md` 文件的目录，为 AI agent 提供可复用的指令集。
_Avoid_: plugin, extension, module

**Package（包）**：
技能的逻辑分组单元。一个包包含一个或多个相关技能，是上传和展示的最小单位。
_Avoid_: bundle, collection, group

**SKILL.md**：
技能的核心文件，使用 Markdown + YAML frontmatter 格式。frontmatter 包含 `name`、`description` 等元数据，body 是给 agent 的指令。
_Avoid_: skill file, config file

**Upload（上传）**：
用户通过 `owl upload` 将本地技能包提交到平台的过程。CLI 打包后发送到 API，API 代理创建 GitHub PR。
_Avoid_: publish, submit, push

**owl-skills（owl）**：
CLI 工具名称，用于上传、安装和管理技能。基于 vercel-labs/skills 完整 fork，保留全部原版能力（38 种 agent、交互式 UI、search-multiselect、blob 安装、well-known providers、lock 文件、telemetry 等），bin name 为 `owl`。增量添加 upload 命令和 hub-name 解析。
_Avoid_: cli, tool, os

**Hub**：
Web 端，技能的发现和展示界面。Next.js 应用，部署在 Vercel。
_Avoid_: website, portal, marketplace

**Source（来源）**：
技能的 GitHub 仓库地址。当前所有技能存储在同一个仓库中。
_Avoid_: origin, repo

## Relationships

- 一个 **Package** 包含一个或多个 **Skills**
- 一个 **Skill** 包含一个 `SKILL.md` 和零或多个附属文件
- **Upload** 将一个 **Package** 从本地提交到 GitHub 仓库（通过 PR）
- **Hub** 从 GitHub 仓库读取 **Package** 数据并展示
- **owl-skills** CLI 可以执行 **Upload**（上传）、**Add**（安装）、**Remove**（移除）、**List**（列表）、**Find**（搜索）、**Update**（更新）、**Init**（初始化）、**Sync**（同步）等操作

## Example dialogue

> **Dev:** "用户上传一个包，里面有两个技能，PR 应该怎么组织？"
> **Domain expert:** "一个 PR 对应一个 Package。PR 的 files 变更里会包含 `skills/<package-name>/skill-a/SKILL.md` 和 `skills/<package-name>/skill-b/SKILL.md`。"

> **Dev:** "用户执行 `owl add mattpocock/skills`，这是安装一个包还是一个技能？"
> **Domain expert:** "这取决于仓库结构。如果 mattpocock/skills 下面是多个技能目录，就是安装一个包（用户可以勾选要装哪些）。如果只有一个 SKILL.md，就是安装单个技能，跳过选择步骤。"

## Flagged ambiguities

- "skill" 有时被用来指代整个包（包含多个技能目录），有时指单个技能目录。规范：**Package** = 集合，**Skill** = 单个。
