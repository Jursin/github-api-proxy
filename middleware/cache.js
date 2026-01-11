const redisClient = require('../config/redis');

// 缓存中间件
const cacheMiddleware = async (req, res, next) => {
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log('缓存命中:', cacheKey);
      return res.json(JSON.parse(cached));
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
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    console.log('缓存设置成功:', key);
  } catch (error) {
    console.error('缓存设置失败:', error);
  }
};

module.exports = { cacheMiddleware, setCache };