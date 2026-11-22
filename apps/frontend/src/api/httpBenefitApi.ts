// 실제 서버용 BenefitApi 구현 (백엔드 routes/subscription.js, routes/rewards.js)
// 응답 { success, data } 의 data를 화면용 camelCase로 바꾼다.

import api from './axios';
import { toApiError } from './httpProgressApi.ts';
import type { BenefitApi } from './benefitApi.ts';
import type { Plan } from './progressTypes.ts';
import type {
  MockPaymentResult,
  PaymentLog,
  PaymentStatus,
  RedeemResult,
  Redemption,
  RewardItem,
  RewardList,
  RewardSummary,
  SubscribeResult,
  SubscriptionInfo,
} from './benefitTypes.ts';

type Raw = Record<string, unknown>;

const num = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const strOrNull = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);
const unwrap = (data: unknown): Raw => {
  const body = (data ?? {}) as Raw;
  return body.data && typeof body.data === 'object' ? (body.data as Raw) : body;
};
const plan = (value: unknown): Plan => (value === 'premium' ? 'premium' : 'basic');

const mapPayment = (raw: Raw): PaymentLog => ({
  id: num(raw.payment_id),
  amount: num(raw.amount),
  status: (['pending', 'success', 'failed'].includes(raw.pay_status as string) ? raw.pay_status : 'pending') as PaymentStatus,
  transactionId: strOrNull(raw.pg_transaction_id),
  createdAt: String(raw.created_at ?? ''),
});

const mapRewardSummary = (raw: Raw): RewardSummary => ({
  id: num(raw.reward_id),
  name: String(raw.reward_name ?? ''),
  requiredPoint: num(raw.required_point),
  imageKey: strOrNull(raw.image_key),
});

const mapReward = (raw: Raw): RewardItem => ({
  ...mapRewardSummary(raw),
  stock: num(raw.stock),
  premiumOnly: Boolean(raw.is_premium_only),
  soldOut: Boolean(raw.sold_out),
  locked: Boolean(raw.locked),
});

export const httpBenefitApi: BenefitApi = {
  isMock: false,

  async getSubscription(): Promise<SubscriptionInfo> {
    try {
      const { data } = await api.get('/subscription');
      const body = unwrap(data);
      return {
        plan: plan(body.plan),
        status: strOrNull(body.sub_status),
        startedAt: strOrNull(body.started_at),
        expiresAt: strOrNull(body.expires_at),
        price: num(body.price),
        periodDays: num(body.period_days, 30),
        pointMultiplier: num(body.point_multiplier, 1),
        payments: Array.isArray(body.payments) ? (body.payments as Raw[]).map(mapPayment) : [],
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async subscribePremium(mockResult?: MockPaymentResult): Promise<SubscribeResult> {
    try {
      const { data } = await api.post('/subscription', mockResult ? { plan: 'premium', mock_result: mockResult } : { plan: 'premium' });
      const body = unwrap(data);
      return {
        plan: plan(body.plan),
        status: strOrNull(body.sub_status),
        expiresAt: strOrNull(body.expires_at),
        payment: body.payment && typeof body.payment === 'object' ? mapPayment(body.payment as Raw) : null,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getRewards(): Promise<RewardList> {
    try {
      const { data } = await api.get('/rewards');
      const body = unwrap(data);
      return {
        plan: plan(body.plan),
        balance: num(body.balance),
        items: Array.isArray(body.items) ? (body.items as Raw[]).map(mapReward) : [],
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async redeemReward(rewardId: number): Promise<RedeemResult> {
    try {
      const { data } = await api.post(`/rewards/${rewardId}/redeem`);
      const body = unwrap(data);
      return {
        redemptionId: num(body.redemption_id),
        status: String(body.redemption_status ?? 'completed'),
        balance: num(body.balance),
        reward: mapRewardSummary((body.reward as Raw) ?? {}),
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getRedemptions(): Promise<Redemption[]> {
    try {
      const { data } = await api.get('/rewards/redemptions');
      const body = unwrap(data);
      return Array.isArray(body.items)
        ? (body.items as Raw[]).map((raw) => ({
            id: num(raw.redemption_id),
            status: String(raw.redemption_status ?? ''),
            redeemedAt: String(raw.redeemed_at ?? ''),
            reward: mapRewardSummary((raw.reward as Raw) ?? {}),
          }))
        : [];
    } catch (error) {
      throw toApiError(error);
    }
  },
};
