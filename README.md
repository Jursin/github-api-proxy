# GitHub API 代理服务

## 项目结构
```
github-api-proxy/
├── server.js              # 主服务文件
├── package.json           # 项目配置和依赖
├── .gitignore            # Git忽略文件
├── README.md             # 项目说明文档
├── config/               # 配置文件目录
│   └── redis.js         # Redis配置
├── middleware/           # 中间件目录
│   ├── cache.js         # 缓存中间件
│   └── errorHandler.js  # 错误处理中间件
├── utils/               # 工具函数目录
│   ├── fetchWithRetry.js # 重试机制
│   └── logger.js        # 日志工具
├── routes/              # 路由目录
│   └── github.js        # GitHub API路由
└── pm2.config.js        # PM2配置文件
```

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

- Node.js 16+
- Redis 6+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=
NODE_ENV=development
GITHUB_API_TOKEN=ghp_xxx # 可选：使用 GitHub 令牌提高速率限制
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name github-api-proxy

# 查看状态
pm2 status

# 查看日志
pm2 logs github-api-proxy
```

## API 接口

### 获取仓库信息

```
GET /api/github/repos/:owner/:repo
```

示例：
```bash
curl http://localhost:3000/api/github/repos/facebook/react
```

### 获取用户仓库列表

```
GET /api/github/users/:username/repos
```

参数：
- `page`：页码，默认1
- `per_page`：每页数量，默认30

示例：
```bash
curl http://localhost:3000/api/github/users/octocat/repos?page=1&per_page=10
```

### 获取仓库提交记录

```
GET /api/github/repos/:owner/:repo/commits
```

参数：
- `page`：页码，默认1
- `per_page`：每页数量，默认30

示例：
```bash
curl http://localhost:3000/api/github/repos/facebook/react/commits?page=1&per_page=20
```

### 获取仓库最后提交时间（东八区格式化）

```
GET /api/github/repos/:owner/:repo/last_commit
```

参数：
- `branch`：分支名称（可选，默认使用仓库的默认分支）
- `date`：`long`（默认，包含年份），`short`（省略年份）
- `time`：`long`（默认，包含秒），`short`（省略秒）

说明：
- 获取指定分支的最新一条 commit 的提交时间
- 如果未指定 `branch` 参数，将自动使用仓库的默认分支（如 `main` 或 `master`）
- 返回时间已转换为东八区，格式基础为 `YYYY/MM/DD HH:MM:SS`
- 示例（默认参数）：`2026/01/14 20:00:00`
- 示例（`date=short&time=short`）：`01/14 20:00`

示例：
```bash
# 获取默认分支最新提交
curl "http://localhost:3000/api/github/repos/facebook/react/last_commit?date=long&time=short"

# 获取指定分支最新提交
curl "http://localhost:3000/api/github/repos/facebook/react/last_commit?branch=dev&date=short&time=short"
```

### 获取仓库发布（含 assets 下载量）

```
GET /api/github/repos/:owner/:repo/releases
```

参数：
- `page`：页码，默认1
- `per_page`：每页数量，默认10

示例：
```bash
curl http://localhost:3000/api/github/repos/facebook/react/releases?per_page=5
```

## 健康检查

```
GET /health
```

返回：
```json
{
  "status": "OK",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

## 部署

### 宝塔面板部署

1. 安装 Node.js 版本管理器
2. 安装 Redis
3. 安装 PM2 管理器
4. 上传项目文件
5. 在 PM2 管理器中添加项目
6. 配置反向代理

### Docker 部署

```bash
docker build -t github-api-proxy .
docker run -d -p 3000:3000 --name github-api-proxy github-api-proxy
```

## 性能优化

- 调整缓存时间：根据数据更新频率设置合理的缓存时间
- 监控内存使用：2G 内存服务器注意监控 Redis 和 Node.js 内存使用
- 负载均衡：多实例部署时使用 Nginx 负载均衡

## 许可证

MIT License
