// 어떤 ProgressApi 구현을 쓸지 한 곳에서 정한다.
// - 기본: mock (백엔드 API 미구현) → 화면에 "임시 값" 표시
// - VITE_PROGRESS_API=http: 실제 서버 (httpProgressApi)

import type { ProgressApi } from './progressApi.ts';
import { httpProgressApi } from './httpProgressApi.ts';
import { mockProgressServer } from '../mocks/mockProgressServer.ts';

export const progressApi: ProgressApi =
  import.meta.env.VITE_PROGRESS_API === 'http' ? httpProgressApi : mockProgressServer;
