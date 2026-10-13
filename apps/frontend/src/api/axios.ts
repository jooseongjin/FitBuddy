import axios from 'axios';

// TRD 명세에 작성된 백엔드 REST API Base URL (/api/v1)
const api = axios.create({
  baseURL: 'http://localhost:4000/api/v1',
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

export default api;