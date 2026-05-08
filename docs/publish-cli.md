# owl-skills CLI 发布手册

## 前置条件

- 拥有 npm 账号，且已开启双因素认证（2FA）
- 拥有该仓库的 push 权限
- 当前位于 `tools/owl-skills` 目录下

## 发布步骤

### 1. 跑通测试和构建

```bash
cd tools/owl-skills
vp test
vp pack
```

要求：42 个测试全部通过，构建产物在 `dist/` 目录下。

### 2. 确认版本号

```bash
node -e "console.log(require('./package.json').version)"
```

- 版本号规则：`major.minor.patch`，当前阶段用 `0.x.x`
- 不能发布已存在的版本号（`npm publish` 会拒绝）
- 如需 bump，直接修改 `package.json` 中的 `version` 字段

### 3. 登录 npm

```bash
npm login
```

按提示在浏览器中完成 2FA 授权。如果已经登录过且 token 未过期，可跳过。

### 4. 发布

```bash
npm publish
```

发布成功后返回类似：

```
+ owl-skills@0.1.1
```

### 5. 验证

```bash
npx owl --version
```

应显示最新版本号。

## 常见问题

### `Unsupported URL Type "catalog:"`

说明 `package.json` 里还有 pnpm 的 `catalog:` 语法。检查 `dependencies`，把 `catalog:` 替换为实际的版本号。参考 [ADR 0004](adr/0004-nextjs-with-vite-plus-monorepo.md)。

### `workspace:*` 依赖

owl-skills 依赖了 monorepo 的 workspace 包（如 `utils`）。发布前需要把这部分代码内联到自身，或把依赖换成普通 npm 包。当前已把 `parseSkillMd` 内联到 `upload.ts`，移除了对 `utils` 的依赖。

### 包名已被占用

如果 `owl-skills` 这个名字被其他人占用，需要换一个。当前包名 `owl-skills` 属于本组织账号。

## 版本历史

| 版本  | 日期       | 变更                                                   |
| ----- | ---------- | ------------------------------------------------------ |
| 0.1.2 | 2026-05-08 | 移除 `find-skills` 安装广告弹窗                        |
| 0.1.1 | 2026-05-07 | 修复 npm 发布依赖：移除 pnpm catalog 和 workspace 依赖 |
| 0.1.0 | 2026-05-07 | 初始发布（依赖有问题，无法直接安装）                   |
