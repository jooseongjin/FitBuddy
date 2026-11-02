// 실제 서버용 ProgressApi 구현 (설계서 8장 명세 기준 초안)
// 백엔드 API가 준비되면 .env에 VITE_PROGRESS_API=http 를 설정해 사용한다.
// 서버 응답은 TRD 기준 snake_case로 가정하고 화면용 camelCase로 바꾼다. (B11 확정 후 조정)

import axios from 'axios';
import api from './axios';
import type { ProgressApi, RepairRequest } from './progressApi.ts';
import {
  ApiError,
  type CharacterProgress,
  type RepairInfo,
  type RepairResult,
  type StreakState,
} from './progressTypes.ts';

type Raw = Record<string, unknown>;

const num = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : fallback);
const numOrNull = (value: unknown) => (typeof value === 'number' ? value : null);
const strOrNull = (value: unknown) => (typeof value === 'string' ? value : null);

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } } | undefined;
    if (body?.error?.code) return new ApiError(body.error.code, body.error.message ?? '요청을 처리하지 못했어요.', body.error.details);
    return new ApiError('NETWORK_ERROR', '연결이 불안정해 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return new ApiError('UNKNOWN_ERROR', '알 수 없는 오류가 발생했어요.');
};

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
      return { streak: mapStreak(streak), balance: num(balance.balance) };
    } catch (error) {
      throw toApiError(error);
    }
  },
};
