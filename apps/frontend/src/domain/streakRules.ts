// Streak 규칙 (설계서 6장). 화면과 무관한 순수 함수.
// 실제 판정은 서버가 하며, 이 파일은 mock 서버·화면 표시·단위 테스트에서 사용한다.
// 백엔드 팀원이 같은 규칙을 구현할 때 참고할 수 있도록 TRD 문구와 맞춰 둠.

import { addDays, diffDays, kstHour, monthKey, nextMonthFirst, type DateKey } from './kst.ts';
import type { Plan, RepairInfo, RepairMethod, StreakState, WeekDayStatus } from '../api/progressTypes.ts';

export type RepairRecord = { missedDate: DateKey; method: RepairMethod; repairedOn: DateKey };

/** 서버에 저장되는 Streak 원본 값 (Streaks 테이블 + 완료 기록 + 복구 이력) */
export type StreakRecord = {
  currentStreak: number; // C (저장값, 끊겨도 바로 0으로 덮어쓰지 않음 — TRD 미결 #3)
  lastCompletedDate: DateKey | null; // L
  completedDates: DateKey[]; // 주간 기록 표시용
  repairs: RepairRecord[];
};

/** 복구 정책 — 값은 백엔드 결정(B7·B8). 프론트에서는 mock 설정으로만 주입 */
export type RepairPolicy = {
  costPoints: number | null;
  monthlyLimit: Record<Plan, number>;
  premiumFreePerMonth: number;
};

export type StreakUpdate = { increased: boolean; previous: number; current: number; restarted: boolean };

/** 마지막 완료일로부터 지난 날 수. 기록이 없으면 null */
const gapFrom = (record: StreakRecord, today: DateKey) =>
  record.lastCompletedDate === null ? null : diffDays(record.lastCompletedDate, today);

/** 표시용 연속 일수: 어제 또는 오늘까지 이어졌으면 C, 아니면 0 (6.2) */
export const getDisplayStreak = (record: StreakRecord, today: DateKey): number => {
  const gap = gapFrom(record, today);
  return gap !== null && gap <= 1 ? record.currentStreak : 0;
};

/**
 * 미션 완료 시 Streak 갱신 (6.3, TRD FR-05-01)
 * - 오늘 이미 완료 → 변화 없음 (하루 최대 +1)
 * - 어제까지 이어짐 → +1
 * - 그 외(끊김·첫 기록) → 1부터 다시 시작
 */
export const applyMissionComplete = (
  record: StreakRecord,
  today: DateKey,
): { record: StreakRecord; update: StreakUpdate } => {
  const previous = getDisplayStreak(record, today);
  const gap = gapFrom(record, today);
  const completedDates = record.completedDates.includes(today) ? record.completedDates : [...record.completedDates, today];

  if (gap === 0) {
    return { record: { ...record, completedDates }, update: { increased: false, previous, current: previous, restarted: false } };
  }
  if (gap === 1) {
    const current = record.currentStreak + 1;
    return {
      record: { ...record, currentStreak: current, lastCompletedDate: today, completedDates },
      update: { increased: true, previous, current, restarted: false },
    };
  }
  // 첫 기록이면 "다시 시작" 연출 없이 1일
  const restarted = record.lastCompletedDate !== null;
  return {
    record: { ...record, currentStreak: 1, lastCompletedDate: today, completedDates },
    update: { increased: true, previous, current: 1, restarted },
  };
};

const repairsThisMonth = (record: StreakRecord, today: DateKey) =>
  record.repairs.filter((repair) => monthKey(repair.repairedOn) === monthKey(today));

/** 복구 가능 여부와 화면 표시 정보 (6.5, TRD FR-05-02·05·06) */
export const getRepairInfo = (
  record: StreakRecord,
  today: DateKey,
  plan: Plan,
  policy: RepairPolicy,
): RepairInfo => {
  const used = repairsThisMonth(record, today);
  const monthlyRemaining = Math.max(0, policy.monthlyLimit[plan] - used.length);
  const freeUsed = used.filter((repair) => repair.method === 'free').length;
  const freeRemaining =
    plan === 'premium' ? Math.min(monthlyRemaining, Math.max(0, policy.premiumFreePerMonth - freeUsed)) : 0;
  const base: RepairInfo = {
    status: 'none',
    missedDate: null,
    brokenStreak: 0,
    cost: policy.costPoints,
    freeRemaining,
    monthlyRemaining,
    resetsOn: nextMonthFirst(today),
  };

  const gap = gapFrom(record, today);
  if (gap === null || gap <= 1 || record.currentStreak < 1) return base;
  if (gap > 2) return { ...base, status: 'expired', brokenStreak: record.currentStreak };
  // gap === 2: 어제 하루만 빠짐
  // B9 MVP 추천안(미확정): 오늘 미션을 완료하면 L = today가 되어 여기까지 오지 않음 → 완료 전에만 복구 가능
  return {
    ...base,
    status: monthlyRemaining > 0 ? 'available' : 'monthly_limit',
    missedDate: addDays(today, -1),
    brokenStreak: record.currentStreak,
  };
};

export type RepairErrorCode =
  | 'STREAK_NOT_BROKEN'
  | 'STREAK_NOT_REPAIRABLE'
  | 'MISSED_DATE_MISMATCH'
  | 'ALREADY_REPAIRED'
  | 'MONTHLY_LIMIT_EXCEEDED'
  | 'PREMIUM_REQUIRED'
  | 'NO_FREE_REPAIR'
  | 'REPAIR_COST_UNDEFINED'
  | 'INSUFFICIENT_POINTS';

/** 복구 요청 검증. 문제가 없으면 null (6.5 조건 1~6, 6.6 오류) */
export const validateRepair = (
  record: StreakRecord,
  today: DateKey,
  request: { missedDate: DateKey; method: RepairMethod },
  plan: Plan,
  policy: RepairPolicy,
  balance: number,
): RepairErrorCode | null => {
  const gap = gapFrom(record, today);
  if (gap === null || gap <= 1 || record.currentStreak < 1) return 'STREAK_NOT_BROKEN';
  if (gap > 2) return 'STREAK_NOT_REPAIRABLE';
  if (request.missedDate !== addDays(today, -1)) return 'MISSED_DATE_MISMATCH';
  if (record.repairs.some((repair) => repair.missedDate === request.missedDate)) return 'ALREADY_REPAIRED';
  const info = getRepairInfo(record, today, plan, policy);
  if (info.monthlyRemaining <= 0) return 'MONTHLY_LIMIT_EXCEEDED';
  if (request.method === 'free') {
    if (plan !== 'premium') return 'PREMIUM_REQUIRED';
    if (info.freeRemaining <= 0) return 'NO_FREE_REPAIR';
    return null;
  }
  if (policy.costPoints === null) return 'REPAIR_COST_UNDEFINED';
  if (balance < policy.costPoints) return 'INSUFFICIENT_POINTS';
  return null;
};

/** 복구 적용: 연속 일수는 그대로, 마지막 완료일만 빠진 날로 (TRD FR-05-03) */
export const applyRepair = (
  record: StreakRecord,
  today: DateKey,
  missedDate: DateKey,
  method: RepairMethod,
): StreakRecord => ({
  ...record,
  lastCompletedDate: missedDate,
  repairs: [...record.repairs, { missedDate, method, repairedOn: today }],
});

/**
 * 주간 기록 7칸 (UI 9) — 오늘을 포함한 최근 7일
 * 월~일 고정으로 하면 월요일에는 오늘 한 칸만 보여 연속 기록이 안 보이므로, 최근 7일로 표시
 */
export const recentDays = (today: DateKey, count = 7): DateKey[] =>
  Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));

export const buildWeek = (record: StreakRecord, today: DateKey): StreakState['week'] =>
  recentDays(today).map((date) => {
    let status: WeekDayStatus;
    const done = record.completedDates.includes(date);
    if (date === today) status = done ? 'today_done' : 'today_pending';
    else if (date > today) status = 'future';
    else if (done) status = 'done';
    else if (record.repairs.some((repair) => repair.missedDate === date)) status = 'repaired';
    else status = 'missed';
    return { date, status };
  });

/**
 * 위험 배너 표시 조건 (6.4, 프론트 정책)
 * 연속 기록 유지 중(끊기지 않음, 1일 이상) + 오늘 미완료 + KST 기준 시각 ≥ bannerHour
 */
export const shouldShowRiskBanner = (
  streak: Pick<StreakState, 'currentStreak' | 'todayCompleted' | 'isBroken' | 'serverNow'>,
  bannerHour: number,
): boolean =>
  !streak.isBroken &&
  !streak.todayCompleted &&
  streak.currentStreak >= 1 &&
  kstHour(new Date(streak.serverNow)) >= bannerHour;

/** 서버 원본 → 화면용 StreakState */
export const toStreakState = (
  record: StreakRecord,
  now: Date,
  today: DateKey,
  plan: Plan,
  policy: RepairPolicy,
): StreakState => {
  const display = getDisplayStreak(record, today);
  const gap = gapFrom(record, today);
  return {
    currentStreak: display,
    lastCompletedDate: record.lastCompletedDate,
    todayCompleted: gap === 0,
    isBroken: record.lastCompletedDate !== null && gap !== null && gap > 1,
    plan,
    repair: getRepairInfo(record, today, plan, policy),
    week: buildWeek(record, today),
    serverNow: toKstIso(now),
  };
};

/** ISO 문자열을 KST 오프셋으로 ('2026-11-01T20:15:00+09:00') */
export const toKstIso = (now: Date): string => {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
  return `${shifted}+09:00`;
};
