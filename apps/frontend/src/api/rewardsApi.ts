import api from './axios';

export interface RewardItem {
  reward_id: number;
  reward_name: string;
  required_point: number;
  stock: number;
  is_premium_only: boolean;
  image_key: string | null;
  sold_out?: boolean;
  locked?: boolean;
}

export interface RewardRedemption {
  redemption_id: number;
  redemption_status: string;
  redeemed_at: string;
  reward: {
    reward_id: number;
    reward_name: string;
    required_point: number;
    image_key: string | null;
  };
}

export interface ListRewardsResponse {
  items: RewardItem[];
  balance: number;
  plan?: string;
}

export interface RedeemRewardResponse {
  redemption_id: number;
  redemption_status: string;
  balance: number;
  reward: RewardItem;
}

export const fetchRewards = async (): Promise<ListRewardsResponse> => {
  const res = await api.get('/rewards');
  return res.data?.data ?? res.data;
};

export const fetchRedemptions = async (): Promise<RewardRedemption[]> => {
  const res = await api.get('/rewards/redemptions');
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : (data?.items ?? []);
};

export const redeemRewardItem = async (rewardId: number): Promise<RedeemRewardResponse> => {
  const res = await api.post(`/rewards/${rewardId}/redeem`);
  return res.data?.data ?? res.data;
};
