// 구독·기프티콘 API 구현 선택 (progressClient와 같은 기준)
// - 기본: 실제 서버 (httpBenefitApi)
// - VITE_PROGRESS_API=mock: mock 서버 (잔액·플랜을 레벨·Streak mock과 공유)

import type { BenefitApi } from './benefitApi.ts';
import { httpBenefitApi } from './httpBenefitApi.ts';
import { mockProgressServer } from '../mocks/mockProgressServer.ts';

export const benefitApi: BenefitApi = import.meta.env.VITE_PROGRESS_API === 'mock' ? mockProgressServer : httpBenefitApi;
