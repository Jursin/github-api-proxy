/**
 * Vercel Serverless 入口文件
 * 将 Express app 作为 handler 导出
 */

const app = require('../server');

module.exports = app;
