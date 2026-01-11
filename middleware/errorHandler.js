const errorHandler = (err, req, res, next) => {
  console.error('错误详情:', err);
  
  // GitHub API错误
  if (err.response?.status === 403 && err.response?.data?.message?.includes('rate limit')) {
    return res.status(429).json({
      error: 'GitHub API速率限制',
      message: '请稍后重试',
      retryAfter: err.response.headers['retry-after'] || 60
    });
  }
  
  // 超时错误
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      error: '请求超时',
      message: 'GitHub API响应超时'
    });
  }
  
  // 网络错误
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: '服务不可用',
      message: '无法连接到GitHub API'
    });
  }

  // 其他带响应状态码的 GitHub API 错误
  if (err.response) {
    const status = err.response.status || 500;
    return res.status(status).json({
      error: 'GitHub API错误',
      message: err.response.data?.message || 'GitHub API请求失败'
    });
  }
  
  // 默认错误
  res.status(err.status || 500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器繁忙，请稍后重试'
  });
};

module.exports = errorHandler;