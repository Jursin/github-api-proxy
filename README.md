# GitHub API 代理服务

基于 Node.js + Express + Redis 的 GitHub API 代理服务，解决前端直接调用 GitHub API 不稳定问题。

## 功能特性

- ✅ 缓存机制：Redis 缓存，减少 API 调用次数
- ✅ 重试机制：指数退避重试，提高成功率
- ✅ 速率限制处理：自动处理 GitHub API 速率限制
- ✅ 错误处理：完善的错误处理和降级策略
- ✅ 安全防护：Helmet 安全头，防止常见攻击
- ✅ 性能优化：响应压缩，减少传输体积

## 快速开始

### 环境要求

- Node.js
- npm
- Redis

### 启动开发服务器

```bash
npm run dev
```

## API 接口

### 健康检查

```
GET /health
```

### 通用代理（示例）

```
GET /repos/:owner/:repo
GET /users/:username/repos
GET /search/repositories?q=language:javascript
```

说明：
- 获取仓库信息
- 获取用户仓库列表
- 搜索仓库

### 获取仓库最后提交时间（东八区格式化）

```
GET /repos/:owner/:repo/last_commit
```

参数：
- `branch`：分支名称（可选，默认使用仓库的默认分支）
- `date`：`long`（默认，包含年份），`short`（省略年份）
- `time`：`long`（默认，包含秒），`short`（省略秒）

说明：
- 获取指定分支的最新一条 commit 的提交时间
- 如果未指定 `branch` 参数，将自动使用仓库的默认分支（如 `main` 或 `master`）
- 返回时间已转换为东八区，格式基础为 `YYYY/MM/DD HH:MM:SS`
