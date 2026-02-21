const isVercel = !!process.env.VERCEL;
let redisClient;

if (!isVercel) {
  redisClient = require('../config/redis');
}

// 内存缓存（用于 Vercel 或 Redis 不可用时）
const memoryCache = new Map();

// 缓存中间件
const cacheMiddleware = async (req, res, next) => {
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    let cached;
    
    if (isVercel) {
      // Vercel 环境：使用内存缓存
      const cacheEntry = memoryCache.get(cacheKey);
      if (cacheEntry && Date.now() < cacheEntry.expiresAt) {
        console.log('缓存命中 (内存):', cacheKey);
        return res.json(cacheEntry.data);
      }
    } else {
      // 本地环境：使用 Redis
      cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('缓存命中 (Redis):', cacheKey);
        return res.json(JSON.parse(cached));
      }
    }
    
    next();
  } catch (error) {
    console.error('缓存读取失败:', error);
    next();
  }
};

// 设置缓存
const setCache = async (key, data, ttl = 300) => {
  try {
    if (isVercel) {
      // Vercel 环境：使用内存缓存
      memoryCache.set(key, {
        data,
        expiresAt: Date.now() + ttl * 1000
      });
      console.log('缓存设置成功 (内存):', key);
    } else {
      // 本地环境：使用 Redis
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      console.log('缓存设置成功 (Redis):', key);
    }
  } catch (error) {
    console.error('缓存设置失败:', error);
  }
};

module.exports = { cacheMiddleware, setCache };