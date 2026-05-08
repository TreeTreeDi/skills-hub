# skills-hub

AI Agent 技能发现与安装平台

## 开发指南

### 环境检查

```bash
vp run ready    # 检查一切就绪
vp run -r test  # 运行全部测试
vp run -r build # 构建整个 monorepo
```

### 启动开发服务

```bash
vp run dev      # 启动 Next.js 开发服务器（默认 3000 端口）
```

## 环境变量

CLI（`owl`）通过 `SKILLS_API_URL` 环境变量来配置 API 端点。

| 变量             | 说明                      | 默认值              |
| ---------------- | ------------------------- | ------------------- |
| `SKILLS_API_URL` | Skills Hub API 的基础 URL | `https://skills.sh` |

### 本地开发

如果你需要 CLI 调用本地开发服务器，先设置环境变量：

```bash
# 方式 1：当前 session 生效
export SKILLS_API_URL=http://localhost:3000

# 方式 2：单次命令生效
SKILLS_API_URL=http://localhost:3000 owl upload hello
```

## CLI 使用

### 方式 1：通过 pnpm workspace（推荐，开发时用）

在项目根目录执行：

```bash
pnpm install
pnpm --filter owl-skills build
```

然后直接用：

```bash
pnpm owl upload hello           # 上传技能包
pnpm owl find typescript        # 搜索技能
pnpm owl add hello              # 安装技能
```

### 方式 2：全局 link（开发调试）

```bash
cd tools/owl-skills
pnpm link --global
```

之后在任何目录都能使用 `owl` 命令。修改代码后重新 `pnpm --filter owl-skills build` 即可更新。

### 方式 3：全局安装（发布后使用）

```bash
npm install -g owl-skills
# 或
pnpm install -g owl-skills
```

安装后可直接使用：

```bash
owl upload hello
owl find typescript
owl add hello
```

## 常用命令

```bash
owl add <package>               # 安装技能
owl upload [dir]                # 上传技能包到 Hub
owl find [query]                # 搜索技能（交互式）
owl list                        # 列出已安装技能
owl remove [skills...]          # 移除技能
owl update [skills...]          # 更新技能
```

了解更多：https://skills.sh
