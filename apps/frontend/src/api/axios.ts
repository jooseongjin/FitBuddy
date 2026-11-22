import axios from 'axios';
import { logout } from '../lib/accountSession';

// TRD 명세에 작성된 백엔드 REST API Base URL (/api/v1)
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 로그인 시 저장된 JWT 토큰이 있으면 API 요청 헤더에 자동으로 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 저장된 토큰이 만료·무효이면(401 INVALID_TOKEN / UNAUTHORIZED) 로그인 정보를 지우고 로그인 화면으로 보낸다.
// 로그인 요청 자체의 실패나 비밀번호 확인 실패(INVALID_CREDENTIALS)는 각 화면이 처리하도록 그대로 넘긴다.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const hadToken = Boolean(error?.config?.headers?.Authorization);
    if (status === 401 && hadToken && (code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED')) {
      logout();
    }
    return Promise.reject(error);
  },
);

export default api;
