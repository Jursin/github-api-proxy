const express = require('express');
const fetchWithRetry = require('../utils/fetchWithRetry');
const { cacheMiddleware, setCache } = require('../middleware/cache');
const router = express.Router();

// 格式化为东八区时间字符串
const formatUpdatedAt = (isoString, dateMode = 'long', timeMode = 'long') => {
  const source = new Date(isoString);

  if (Number.isNaN(source.getTime())) {
    const error = new Error('Invalid updated_at value');
    error.status = 502;
    throw error;
  }

  // Asia/Shanghai 无夏令时，直接加 8 小时偏移
  const gmt8 = new Date(source.getTime() + 8 * 60 * 60 * 1000);
  const pad = (num) => num.toString().padStart(2, '0');

  const yearPart = dateMode === 'short' ? '' : `${gmt8.getUTCFullYear()}/`;
  const month = pad(gmt8.getUTCMonth() + 1);
  const day = pad(gmt8.getUTCDate());
  const hours = pad(gmt8.getUTCHours());
  const minutes = pad(gmt8.getUTCMinutes());
  const secondsPart = timeMode === 'short' ? '' : `:${pad(gmt8.getUTCSeconds())}`;

  const datePart = `${yearPart}${month}/${day}`;
  const timePart = `${hours}:${minutes}${secondsPart}`;

  return `${datePart} ${timePart}`.trim();
};

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

// 获取仓库最后提交时间（格式化）
router.get('/repos/:owner/:repo/last_commit', cacheMiddleware, async (req, res, next) => {
  const { owner, repo } = req.params;
  const { date = 'long', time = 'long', branch } = req.query;
  const dateMode = ['long', 'short'].includes(String(date)) ? String(date) : 'long';
  const timeMode = ['long', 'short'].includes(String(time)) ? String(time) : 'long';

  const cacheKey = `github:${req.originalUrl}`;

  try {
    let targetBranch = branch;

    // 如果未指定分支，获取默认分支
    if (!targetBranch) {
      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const repoData = await fetchWithRetry(repoUrl);
      targetBranch = repoData?.default_branch;

      if (!targetBranch) {
        return res.status(502).json({
          error: 'GitHub 数据缺少 default_branch',
          message: 'GitHub API 返回数据中未找到 default_branch 字段'
        });
      }
    }

    // 获取指定分支的最新一条 commit
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${targetBranch}&per_page=1`;
    const commits = await fetchWithRetry(commitsUrl);

    if (!Array.isArray(commits) || commits.length === 0) {
      return res.status(404).json({
        error: '未找到提交记录',
        message: `分支 ${targetBranch} 没有提交记录`
      });
    }

    const commitDate = commits[0]?.commit?.committer?.date;

    if (!commitDate) {
      return res.status(502).json({
        error: 'GitHub 数据缺少 commit date',
        message: 'GitHub API 返回的 commit 数据中未找到 committer.date 字段'
      });
    }

    const formatted = formatUpdatedAt(commitDate, dateMode, timeMode);

    const payload = {
      commit_date: commitDate,
      formatted,
      branch: targetBranch,
      sha: commits[0].sha,
      timezone: 'UTC+8',
      dateMode,
      timeMode
    };

    // 设置缓存1分钟，保证相对实时
    await setCache(cacheKey, payload, 60);

    res.json(payload);
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