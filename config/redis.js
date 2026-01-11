const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const socketOptions = {
  connectTimeout: 10000,
  reconnectStrategy: (retries) => {
    if (retries > 10) {
      console.log('Redis重连次数过多，放弃连接');
      return new Error('重连失败');
    }
    return Math.min(retries * 100, 3000);
  }
};

// 如果未提供URL，则使用主机和端口配置
if (!redisUrl) {
  socketOptions.host = redisHost;
  socketOptions.port = redisPort;
}

const redisClient = createClient({
  ...(redisUrl ? { url: redisUrl } : {}),
  password: redisPassword,
  socket: socketOptions
});

redisClient.on('connect', () => {
  console.log('正在连接Redis...');
});

redisClient.on('ready', () => {
  console.log('Redis已就绪');
});

redisClient.on('error', (err) => {
  console.error('Redis错误:', err);
});

redisClient.on('reconnecting', () => {
  console.log('Redis正在重连...');
});

module.exports = redisClient;