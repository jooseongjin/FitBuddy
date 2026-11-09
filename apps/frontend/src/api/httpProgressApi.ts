// 실제 서버용 ProgressApi 구현 (설계서 8장 명세 기준 초안)
// 백엔드 API가 준비되면 .env에 VITE_PROGRESS_API=http 를 설정해 사용한다.
// 서버 응답은 TRD 기준 snake_case로 가정하고 화면용 camelCase로 바꾼다. (B11 확정 후 조정)

import axios from 'axios';
import api from './axios';
import type { ProgressApi, RepairRequest } from './progressApi.ts';
import {
  ApiError,
  type CharacterProgress,
  type PointHistoryPage,
  type PointSource,
  type PointTransaction,
  type RepairInfo,
  type RepairResult,
  type StreakState,
} from './progressTypes.ts';

type Raw = Record<string, unknown>;

const num = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : fallback);
const numOrNull = (value: unknown) => (typeof value === 'number' ? value : null);
const strOrNull = (value: unknown) => (typeof value === 'string' ? value : null);

type ErrorBody = {
  // 현재 백엔드 형식: { success: false, code, message }
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  // 설계서 8장 초안 형식: { error: { code, message, details } }
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
};

export const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ErrorBody | undefined;
    const code = body?.error?.code ?? body?.code;
    if (code) {
      return new ApiError(code, body?.error?.message ?? body?.message ?? '요청을 처리하지 못했어요.', body?.error?.details ?? body?.details);
    }
    if (error.response?.status === 404) return new ApiError('NOT_FOUND', '서버에 아직 준비되지 않은 기능이에요.');
    return new ApiError('NETWORK_ERROR', '연결이 불안정해 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return new ApiError('UNKNOWN_ERROR', '알 수 없는 오류가 발생했어요.');
};

const POINT_SOURCES: PointSource[] = ['mission_complete', 'streak_repair', 'shop_purchase', 'reward_redeem'];

/** API-07 거래 1건 (transaction_id, source, amount, created_at) → 화면 형식 */
const mapTransaction = (raw: Raw): PointTransaction => ({
  id: num(raw.transaction_id),
  source: POINT_SOURCES.includes(raw.source as PointSource) ? (raw.source as PointSource) : 'mission_complete',
  amount: num(raw.amount),
  createdAt: String(raw.created_at ?? ''),
  // TRD 응답에는 없음. 서버가 미션·아이템 이름을 주면 표시 (title 또는 description)
  title: strOrNull(raw.title) ?? strOrNull(raw.description),
});

/** 응답 본문이 { success, data: ... } 이면 data, 아니면 그대로 */
const unwrap = (data: Raw): Raw => ((data.data as Raw | undefined) && typeof data.data === 'object' ? (data.data as Raw) : data);

const mapRepair = (raw: Raw): RepairInfo => ({
  status: (raw.status as RepairInfo['status']) ?? 'none',
  missedDate: strOrNull(raw.missed_date),
  brokenStreak: num(raw.broken_streak),
  cost: numOrNull(raw.cost),
  freeRemaining: num(raw.free_remaining),
  monthlyRemaining: num(raw.monthly_remaining),
  resetsOn: String(raw.resets_on ?? ''),
});

const mapStreak = (raw: Raw): StreakState => ({
  currentStreak: num(raw.current_streak),
  lastCompletedDate: strOrNull(raw.last_completed_date),
  todayCompleted: Boolean(raw.today_completed),
  isBroken: Boolean(raw.is_broken),
  plan: raw.plan === 'premium' ? 'premium' : 'basic',
  repair: mapRepair((raw.repair as Raw) ?? {}),
  week: Array.isArray(raw.week)
    ? (raw.week as Raw[]).map((day) => ({ date: String(day.date), status: day.status as StreakState['week'][number]['status'] }))
    : [],
  serverNow: String(raw.server_now ?? new Date().toISOString()),
});

export const httpProgressApi: ProgressApi = {
  isMock: false,

  async getCharacterProgress(): Promise<CharacterProgress> {
    try {
      const { data } = await api.get<Raw>('/character');
      return {
        level: num(data.level, 1),
        totalEarnedXp: num(data.total_earned_xp),
        currentLevelXp: numOrNull(data.current_level_xp),
        nextLevelXp: numOrNull(data.next_level_xp),
        isMaxLevel: Boolean(data.is_max_level),
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getStreak(): Promise<StreakState> {
    try {
      const { data } = await api.get<Raw>('/streak');
      return mapStreak(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async repairStreak(request: RepairRequest): Promise<RepairResult> {
    try {
      await api.post<Raw>(
        '/streak/repair',
        { missed_date: request.missedDate, method: request.method },
        { headers: { 'Idempotency-Key': request.requestId } },
      );
      // 응답 형식(8.4)이 일부 필드만 주므로 전체 상태는 다시 조회
      const { data: streak } = await api.get<Raw>('/streak');
      const { data: balance } = await api.get<Raw>('/points/balance');
      return { streak: mapStreak(unwrap(streak)), balance: num(unwrap(balance).balance) };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getBalance(): Promise<number> {
    try {
      const { data } = await api.get<Raw>('/points/balance');
      return num(unwrap(data).balance);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getPointHistory(page: number, size: number): Promise<PointHistoryPage> {
    try {
      const { data } = await api.get<Raw>('/points/history', { params: { page, size } });
      const body = unwrap(data);
      // 거래 목록: 배열 그대로, 또는 { items | transactions: [...] }
      const list = Array.isArray(data.data)
        ? (data.data as Raw[])
        : Array.isArray(body.items)
          ? (body.items as Raw[])
          : Array.isArray(body.transactions)
            ? (body.transactions as Raw[])
            : Array.isArray(data)
              ? (data as unknown as Raw[])
              : [];
      const items = list.map(mapTransaction);
      // 다음 페이지 여부: 서버가 주면 사용, 없으면 받은 개수로 추정
      const hasMore = typeof body.has_more === 'boolean' ? body.has_more : items.length === size;
      return { items, hasMore };
    } catch (error) {
      throw toApiError(error);
    }
  },
};
