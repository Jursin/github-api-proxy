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

// 获取仓库最后提交时间（格式化）
const handleLastCommit = async (req, res, next) => {
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
};

// 根据路径类型确定缓存时间
const getCacheTTL = (path) => {
  if (path.includes('/commits')) return 60;      // 提交记录 1 分钟
  if (path.includes('/releases')) return 120;    // 发布信息 2 分钟
  if (path.includes('/repos/')) return 300;      // 仓库信息 5 分钟
  if (path.includes('/users/')) return 120;      // 用户信息 2 分钟
  return 300; // 默认 5 分钟
};

// 单独处理 last_commit 端点（具体路由必须在通用路由之前）
router.get('/repos/:owner/:repo/last_commit', cacheMiddleware, handleLastCommit);

// 通用 GitHub API 代理
router.get(/.*/i, cacheMiddleware, async (req, res, next) => {
  const path = req.path; // 获取请求路径
  const query = new URLSearchParams(req.query).toString();
  const url = `https://api.github.com${path}${query ? '?' + query : ''}`;
  const cacheKey = `github:${req.originalUrl}`;
  const ttl = getCacheTTL(path);

  try {
    const data = await fetchWithRetry(url);
    
    // 根据路径类型设置对应的缓存时间
    await setCache(cacheKey, data, ttl);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;