// 어떤 ProgressApi 구현을 쓸지 한 곳에서 정한다.
// - 기본: 실제 서버 (httpProgressApi)
// - VITE_PROGRESS_API=mock: 화면 개발용 임시 데이터

import type { ProgressApi } from './progressApi.ts';
import { httpProgressApi } from './httpProgressApi.ts';
import { mockProgressServer } from '../mocks/mockProgressServer.ts';

export const progressApi: ProgressApi =
  import.meta.env.VITE_PROGRESS_API === 'mock' ? mockProgressServer : httpProgressApi;
