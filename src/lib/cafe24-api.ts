// cafe24 (ychat) 백엔드 axios 인스턴스.
// reference 프로젝트(cafe24Env/완/front/src/axios.js) 의 설정을 그대로 옮겨옴.
//
// CORS 회피를 위해 브라우저 호출은 /api/cafe24 프록시 (Next.js 라우트) 로 보낸다.
// CAFE24_API_HOST 는 widget.js 스크립트 태그 생성처럼 외부 URL 이 필요한 곳에서만 사용.
import axios from 'axios';

export const CAFE24_API_HOST =
  process.env.NEXT_PUBLIC_CAFE24_API_HOST ||
  'https://port-0-ychat-lzgmwhc4d9883c97.sel4.cloudtype.app';

export const DEFAULT_MALL_ID =
  process.env.NEXT_PUBLIC_CAFE24_MALL_ID || 'yogibo';

const cafe24Api = axios.create({
  // cloudtype 백엔드가 idle 상태에서 깨어날 때(cold start) 첫 요청이 길어질 수 있어
  // 15s 는 너무 짧다. 프록시(/api/cafe24) 의 28s abort 를 활용하도록 30s 로 둠.
  baseURL: '/api/cafe24',
  timeout: 30000,
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
  async (error) => {
    // cold start / 일시적 게이트웨이 오류는 1회 자동 재시도 (GET 전용 인스턴스라 안전).
    // 첫 요청이 서버를 깨우고, 재시도 시점엔 보통 응답 가능 상태가 된다.
    const config = error.config;
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
    const isGatewayErr = status === 500 || status === 502 || status === 503 || status === 504;
    const isNetworkErr = !error.response && !isTimeout; // DNS/conn 등
    const retriable = isTimeout || isGatewayErr || isNetworkErr;
    if (config && retriable && !config._retried) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 1500));
      return cafe24Api(config);
    }
    // 401 처리는 events 영역에서만 의미가 있어 자동 redirect 는 피함
    return Promise.reject(error);
  }
);

export default cafe24Api;
