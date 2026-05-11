// cafe24 (ychat) 백엔드 axios 인스턴스.
// reference 프로젝트(cafe24Env/완/front/src/axios.js) 의 설정을 그대로 옮겨옴.
import axios from 'axios';

export const CAFE24_API_HOST =
  process.env.NEXT_PUBLIC_CAFE24_API_HOST ||
  'https://port-0-ychat-lzgmwhc4d9883c97.sel4.cloudtype.app';

export const DEFAULT_MALL_ID =
  process.env.NEXT_PUBLIC_CAFE24_MALL_ID || 'yogibo';

const cafe24Api = axios.create({
  baseURL: CAFE24_API_HOST,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

cafe24Api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const mallId = localStorage.getItem('mallId');
      const userId = localStorage.getItem('userId');
      if (mallId) config.headers['X-Mall-Id'] = mallId;
      if (userId) config.headers['X-User-Id'] = userId;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

cafe24Api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 처리는 events 영역에서만 의미가 있어 자동 redirect 는 피함
    return Promise.reject(error);
  }
);

export default cafe24Api;
