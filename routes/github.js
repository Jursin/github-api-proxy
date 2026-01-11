const express = require('express');
const fetchWithRetry = require('../utils/fetchWithRetry');
const { cacheMiddleware, setCache } = require('../middleware/cache');
const router = express.Router();

// 获取仓库信息
router.get('/repos/:owner/:repo', cacheMiddleware, async (req, res, next) => {
  const { owner, repo } = req.params;
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    const data = await fetchWithRetry(url);
    
    // 设置缓存5分钟
    await setCache(cacheKey, data, 300);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 获取用户仓库列表
router.get('/users/:username/repos', cacheMiddleware, async (req, res, next) => {
  const { username } = req.params;
  const { page = 1, per_page = 30 } = req.query;
  const url = `https://api.github.com/users/${username}/repos?page=${page}&per_page=${per_page}`;
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    const data = await fetchWithRetry(url);
    
    // 设置缓存2分钟
    await setCache(cacheKey, data, 120);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 获取仓库提交记录
router.get('/repos/:owner/:repo/commits', cacheMiddleware, async (req, res, next) => {
  const { owner, repo } = req.params;
  const { page = 1, per_page = 30 } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=${per_page}`;
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    const data = await fetchWithRetry(url);
    
    // 设置缓存1分钟
    await setCache(cacheKey, data, 60);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 获取仓库发布（含资产下载量）
router.get('/repos/:owner/:repo/releases', cacheMiddleware, async (req, res, next) => {
  const { owner, repo } = req.params;
  const { page = 1, per_page = 10 } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?page=${page}&per_page=${per_page}`;
  const cacheKey = `github:${req.originalUrl}`;

  try {
    const data = await fetchWithRetry(url);

    // 设置缓存2分钟，发布信息不变更频繁
    await setCache(cacheKey, data, 120);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;