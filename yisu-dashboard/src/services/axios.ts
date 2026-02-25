// services/axios.ts
import axios from 'axios';

// 开发环境直接使用 localhost
const API_BASE_URL = 'http://localhost:3000/api';

// 或者根据环境判断
// const API_BASE_URL = process.env.NODE_ENV === 'production' 
//   ? 'https://your-production-api.com/api' 
//   : 'http://localhost:3000/api';

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('请求配置:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    console.log('响应成功:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('响应错误:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;