const { createClient } = require('redis');

let redisClient = null;

// 初始化 Redis 客户端
const initRedis = async () => {
  if (redisClient) return redisClient;
  
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('⚠️  未配置 REDIS_URL，缓存功能将不可用');
      return null;
    }
    
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log('✓ Redis 已连接');
    
    return redisClient;
  } catch (error) {
    console.error('✗ Redis 连接失败:', error.message);
    return null;
  }
};

// 缓存中间件
const cacheMiddleware = async (req, res, next) => {
  const redis = await initRedis();
  if (!redis) {
    return next();
  }
  
  const cacheKey = `github:${req.originalUrl}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('✓ 缓存命中:', cacheKey);
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    console.error('✗ 缓存读取失败:', error.message);
  }
  
  next();
};

// 设置缓存
const setCache = async (key, data, ttl = 300) => {
  const redis = await initRedis();
  if (!redis) return;
  
  try {
    await redis.setEx(key, ttl, JSON.stringify(data));
    console.log('✓ 缓存设置:', key, `(TTL: ${ttl}s)`);
  } catch (error) {
    console.error('✗ 缓存设置失败:', error.message);
  }
};

module.exports = { cacheMiddleware, setCache };