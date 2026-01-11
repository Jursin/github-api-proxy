const axios = require('axios');

// 创建带认证的 axios 实例
const createAxiosInstance = () => {
  const token = process.env.GITHUB_API_TOKEN;
  
  return axios.create({
    baseURL: 'https://api.github.com',
    timeout: 10000,
    headers: {
      'User-Agent': 'GitHub-API-Proxy',
      'Accept': 'application/vnd.github.v3+json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });
};

// 带重试的请求函数
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  const axiosInstance = createAxiosInstance();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axiosInstance.get(url, options);
      return response.data;
      
    } catch (error) {
      // 最后一次尝试，直接抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // 401错误（令牌无效），不重试
      if (error.response?.status === 401) {
        error.message = `GitHub认证失败: ${error.response?.data?.message || '无效令牌'}`;
        error.status = 401;
        throw error;
      }
      
      // 速率限制，等待重试
      if (error.response?.status === 403 && 
          error.response?.data?.message?.includes('rate limit')) {
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) || 0;
        const waitTime = Math.max(resetTime - Math.floor(Date.now() / 1000), 0) + 1;
        console.log(`⏰ 速率限制，等待 ${waitTime} 秒后重试`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      
      // 429错误（请求过多），指数退避
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.log(`⚠️ 请求过多，等待 ${retryAfter} 秒`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      // 网络错误，指数退避
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`🌐 网络错误 (${error.code})，${waitTime}ms后重试`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 其他5xx服务器错误
      if (error.response?.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`🔧 GitHub服务器错误 (${error.response.status})，${waitTime}ms后重试`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 4xx客户端错误，不重试
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // 未知错误，指数退避
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`❌ 请求失败 (${error.message})，${waitTime}ms后重试`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

module.exports = fetchWithRetry;