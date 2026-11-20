// 구독(Premium 모의 결제)·기프티콘 교환 데이터 형식
// 서버 응답(snake_case)은 API 구현(httpBenefitApi)에서 이 형식으로 바꿔 넘긴다.
// 백엔드: GET/POST /subscription, GET /rewards, POST /rewards/:id/redeem, GET /rewards/redemptions

import type { Plan } from './progressTypes.ts';

export type PaymentStatus = 'pending' | 'success' | 'failed';

/** 결제 기록 1건 (Payment_logs) */
export type PaymentLog = {
  id: number;
  amount: number;
  status: PaymentStatus;
  /** 모의 결제 거래 ID (MOCK-...). 실패하면 null */
  transactionId: string | null;
  createdAt: string;
};

/** GET /subscription — 내 구독 상태 */
export type SubscriptionInfo = {
  plan: Plan;
  /** 'active' 등. 구독 기록이 없으면 null */
  status: string | null;
  startedAt: string | null;
  /** Premium일 때만 만료일 */
  expiresAt: string | null;
  /** 월 구독 가격(원) */
  price: number;
  /** 구독 기간(일) */
  periodDays: number;
  /** 지금 계정의 미션 포인트 배율 (Basic 1, Premium 1.5) */
  pointMultiplier: number;
  /** 최근 결제 기록 (최신순, 최대 5건) */
  payments: PaymentLog[];
};

/** POST /subscription 성공 응답 */
export type SubscribeResult = {
  plan: Plan;
  status: string | null;
  expiresAt: string | null;
  payment: PaymentLog | null;
};

/** 모의 결제 결과 (시연·테스트용. 기본 success) */
export type MockPaymentResult = 'success' | 'fail';

/** 기프티콘 상품 1개 (GET /rewards items) */
export type RewardItem = {
  id: number;
  name: string;
  requiredPoint: number;
  stock: number;
  premiumOnly: boolean;
  /** /gifticons/{imageKey}.svg 예시 이미지 */
  imageKey: string | null;
  soldOut: boolean;
  /** Premium 전용인데 지금 Basic이면 true */
  locked: boolean;
};

export type RewardList = { plan: Plan; balance: number; items: RewardItem[] };

export type RewardSummary = { id: number; name: string; requiredPoint: number; imageKey: string | null };

/** POST /rewards/:id/redeem 성공 응답 */
export type RedeemResult = {
  redemptionId: number;
  status: string;
  /** 교환 후 FitPoint 잔액 → 공용 FP 상태에 그대로 반영 */
  balance: number;
  reward: RewardSummary;
};

/** 보관함 1건 (GET /rewards/redemptions items) */
export type Redemption = {
  id: number;
  status: string;
  redeemedAt: string;
  reward: RewardSummary;
};

/** 예시 기프티콘 이미지 주소 (프론트 public/gifticons) */
export const gifticonImageSrc = (imageKey: string | null): string | null =>
  imageKey ? `/gifticons/${encodeURIComponent(imageKey)}.svg` : null;
