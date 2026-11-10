// 미션 완료 → 보상(FP·XP·레벨·Streak) API
// - mock: mockProgressServer.completeMission (같은 날 같은 미션 중복 완료 방지)
// - 실제: POST /api/v1/missions/{user_mission_id}/complete (설계서 8.3, 백엔드 B4·B5·B6 작업 후)

import axios from 'axios';
import api from './axios';
import { progressApi } from './progressClient';
import { ApiError, type MissionRewardResult } from './progressTypes';
import { mockProgressServer } from '../mocks/mockProgressServer';
import { toApiError } from './httpProgressApi';

type Raw = Record<string, unknown>;
const num = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : fallback);

const toMissionReward = (raw: Raw): MissionRewardResult => {
  const data = (raw.data as Raw | undefined) ?? raw;
  const level = (data.level as Raw | undefined) ?? {};
  const streak = (data.streak as Raw | undefined) ?? {};
  return {
    earnedPoint: num(data.earned_point),
    earnedXp: num(data.earned_xp, num(data.earned_point)),
    level: { before: num(level.before, 1), after: num(level.after, num(level.before, 1)) },
    totalEarnedXp: num(data.total_earned_xp),
    streak: {
      increased: Boolean(streak.increased),
      previous: num(streak.previous),
      current: num(streak.current),
      restarted: Boolean(streak.restarted),
    },
    balance: num(data.balance),
  };
};

/**
 * 미션 완료 요청. 응답을 그대로 useProgress().applyMissionReward(result)에 넘기면
 * FP·XP·레벨·Streak 갱신과 레벨업 축하가 처리된다.
 * @param basePoint mock에서만 사용하는 미션 기본 포인트 (실제 서버는 미션 DB 값 사용)
 * @param title mock에서만 사용하는 미션 이름 (FitPoint 내역에 표시)
 */
export const completeMission = async (missionId: string, basePoint?: number, title?: string): Promise<MissionRewardResult> => {
  if (progressApi.isMock) return mockProgressServer.completeMission(missionId, basePoint, title ?? null);
  try {
    const { data } = await api.post<Raw>(`/missions/${missionId}/complete`);
    return toMissionReward(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const body = error.response.data as { error?: { message?: string }; message?: string } | undefined;
      throw new ApiError('MISSION_ALREADY_COMPLETED', body?.error?.message ?? body?.message ?? '이미 완료한 미션이에요.');
    }
    // 백엔드 오류 형식 { success:false, code, message } 와 설계서 형식을 함께 처리
    throw toApiError(error);
  }
};
