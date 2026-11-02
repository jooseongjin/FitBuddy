// 레벨·XP·Streak 데이터 형식 (설계서 4.2 / 8장)
// 화면과 공용 상태는 이 타입만 사용한다. 서버 응답(snake_case)은 API 구현에서 이 형식으로 바꿔 넘긴다.

import type { DateKey } from '../domain/kst.ts';

/** 캐릭터 레벨·XP. XP는 줄지 않고, FP(FitPoint)와는 별개 데이터 */
export type CharacterProgress = {
  level: number;
  totalEarnedXp: number;
  /** 현재 레벨 시작 누적 XP. 레벨 기준(B2)이 정해지기 전에는 null → "기준 준비 중" */
  currentLevelXp: number | null;
  /** 다음 레벨에 필요한 누적 XP. 최대 레벨이거나 기준이 없으면 null */
  nextLevelXp: number | null;
  isMaxLevel: boolean;
};

export type RepairStatus = 'none' | 'available' | 'monthly_limit' | 'expired';
export type RepairMethod = 'points' | 'free';
export type Plan = 'basic' | 'premium';

export type RepairInfo = {
  status: RepairStatus;
  /** 복구 대상 날짜 (어제) */
  missedDate: DateKey | null;
  /** 복구하면 유지되는 연속 일수 */
  brokenStreak: number;
  /** FP 복구 비용. 백엔드 결정값(B7) — 아직 미정 */
  cost: number | null;
  /** Premium 무료 복구 남은 횟수 (Basic은 0) — B8 미정 */
  freeRemaining: number;
  /** 이번 달 남은 복구 횟수 — B8 미정 */
  monthlyRemaining: number;
  /** 다음 횟수 초기화일 (매월 1일 KST) */
  resetsOn: DateKey;
};

export type WeekDayStatus = 'done' | 'missed' | 'repaired' | 'today_pending' | 'today_done' | 'future';

export type StreakState = {
  /** 표시용 연속 일수 (끊겼으면 0) */
  currentStreak: number;
  lastCompletedDate: DateKey | null;
  todayCompleted: boolean;
  isBroken: boolean;
  plan: Plan;
  repair: RepairInfo;
  week: { date: DateKey; status: WeekDayStatus }[];
  /** 서버 현재 시각 (ISO, KST 오프셋 포함). 위험 배너 시간 판단에 사용 */
  serverNow: string;
};

export type RepairResult = {
  streak: StreakState;
  /** 복구 후 FP 잔액 → 공용 FP 상태에 그대로 반영 */
  balance: number;
};

/** 미션 완료 응답 중 보상 부분 (팀원의 미션 완료 화면 → 효과 컴포넌트·공용 상태로 전달) */
export type MissionRewardResult = {
  earnedPoint: number;
  earnedXp: number;
  level: { before: number; after: number };
  totalEarnedXp: number;
  streak: { increased: boolean; previous: number; current: number; restarted: boolean };
  balance: number;
};

/** 서버 공통 오류 { error: { code, message, details } } */
export class ApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}
