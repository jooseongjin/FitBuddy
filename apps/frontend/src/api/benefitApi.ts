// 구독·기프티콘 API 인터페이스. 화면은 benefitClient의 구현만 사용한다 (mock ↔ 실제 서버 교체 가능)

import type {
  MockPaymentResult,
  RedeemResult,
  Redemption,
  RewardList,
  SubscribeResult,
  SubscriptionInfo,
} from './benefitTypes.ts';

export interface BenefitApi {
  readonly isMock: boolean;
  /** GET /api/v1/subscription */
  getSubscription(): Promise<SubscriptionInfo>;
  /** POST /api/v1/subscription — Premium 모의 결제. 오류: ALREADY_SUBSCRIBED(409), PAYMENT_FAILED(402) */
  subscribePremium(mockResult?: MockPaymentResult): Promise<SubscribeResult>;
  /** GET /api/v1/rewards */
  getRewards(): Promise<RewardList>;
  /** POST /api/v1/rewards/:id/redeem. 오류: REWARD_NOT_FOUND(404), PREMIUM_REQUIRED(403), OUT_OF_STOCK·INSUFFICIENT_POINTS(409) */
  redeemReward(rewardId: number): Promise<RedeemResult>;
  /** GET /api/v1/rewards/redemptions */
  getRedemptions(): Promise<Redemption[]>;
}
