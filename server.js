require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const githubRoutes = require('./routes/github');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet()); // 安全头
app.use(compression()); // 压缩响应
app.use(cors()); // 跨域
app.use(morgan('combined')); // 日志
app.use(express.json({ limit: '10mb' }));
// 根目录返回 API 文档
app.get('/', (req, res) => {
  res.json({ 
    name: 'GitHub API 代理服务',
    version: '1.0.0',
    description: '基于 Node.js + Express 的 GitHub API 代理服务',
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: '健康检查'
      },
      getRepoInfo: {
        method: 'GET',
        path: '/api/github/repos/:owner/:repo',
        description: '获取仓库信息'
      },
      getUserRepos: {
        method: 'GET',
        path: '/api/github/users/:username/repos',
        description: '获取用户仓库列表',
        params: {
          page: '页码，默认1',
          per_page: '每页数量，默认30'
        }
      },
      getRepoCommits: {
        method: 'GET',
        path: '/api/github/repos/:owner/:repo/commits',
        description: '获取仓库提交记录',
        params: {
          page: '页码，默认1',
          per_page: '每页数量，默认30'
        }
      },
      getLastCommit: {
        method: 'GET',
        path: '/api/github/repos/:owner/:repo/last_commit',
        description: '获取仓库最后提交时间（东八区格式化）',
        params: {
          branch: '分支名称（可选，默认使用仓库的默认分支）',
          date: 'long（默认，包含年份）或 short（省略年份）',
          time: 'long（默认，包含秒）或 short（省略秒）'
        }
      },
      getReleases: {
        method: 'GET',
        path: '/api/github/repos/:owner/:repo/releases',
        description: '获取仓库发布（含 assets 下载量）',
        params: {
          page: '页码，默认1',
          per_page: '每页数量，默认10'
        }
      }
    }
  });
});
// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api/github', githubRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use(errorHandler);

// 导出 Vercel Serverless Function
module.exports = app;

// 本地开发时启动服务
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务...');
    process.exit(0);
  });
}