// 레벨·XP 규칙 (설계서 5장). 화면과 무관한 순수 함수.
// - 레벨은 XP 누적으로 자동 상승 (FP를 쓰는 레벨업 없음)
// - 레벨별 필요 XP·최대 레벨은 서버가 정함(B2). 프론트는 서버 값을 표시하고, 기준표는 mock에서만 사용

import type { CharacterProgress } from '../api/progressTypes.ts';

/**
 * 누적 XP 기준표: table[i] = (i + 1)레벨이 되는 누적 XP. table[0]은 0, 길이 = 최대 레벨.
 * null이면 기준 미정.
 */
export type LevelXpTable = readonly number[] | null;

/** 누적 XP → 레벨 (서버 로직의 mock 버전) */
export const levelFromXp = (totalXp: number, table: LevelXpTable, fallbackLevel: number): number => {
  if (!table || table.length === 0) return fallbackLevel;
  let level = 1;
  for (let i = 0; i < table.length; i += 1) {
    if (totalXp >= table[i]) level = i + 1;
  }
  // 기준표가 생기기 전 레벨보다 내려가지 않음 (TRD: 레벨은 내려가지 않음)
  return Math.max(level, fallbackLevel);
};

export const buildCharacterProgress = (totalXp: number, level: number, table: LevelXpTable): CharacterProgress => {
  if (!table || table.length === 0) {
    return { level, totalEarnedXp: totalXp, currentLevelXp: null, nextLevelXp: null, isMaxLevel: false };
  }
  const isMaxLevel = level >= table.length;
  return {
    level,
    totalEarnedXp: totalXp,
    currentLevelXp: table[Math.min(level, table.length) - 1] ?? 0,
    nextLevelXp: isMaxLevel ? null : table[level],
    isMaxLevel,
  };
};

export type XpProgressView =
  | { kind: 'progress'; ratio: number; remaining: number }
  | { kind: 'pending' } // 기준 준비 중
  | { kind: 'max' };

/** 진행 바 표시값 (UI 5) */
export const getXpProgress = (progress: CharacterProgress): XpProgressView => {
  if (progress.isMaxLevel) return { kind: 'max' };
  if (progress.currentLevelXp === null || progress.nextLevelXp === null) return { kind: 'pending' };
  const span = progress.nextLevelXp - progress.currentLevelXp;
  if (span <= 0) return { kind: 'pending' };
  const inLevel = progress.totalEarnedXp - progress.currentLevelXp;
  return {
    kind: 'progress',
    ratio: Math.min(1, Math.max(0, inLevel / span)),
    remaining: Math.max(0, progress.nextLevelXp - progress.totalEarnedXp),
  };
};

/** 레벨업 축하 판단 결과. store가 null이 아니면 그 값으로 "본 레벨"을 저장 */
export type CelebrationDecision = { show: false; store: number | null } | { show: true; from: number; to: number; store: number };

/**
 * A. 미션 완료 응답 (설계서 5.4)
 * level.after > level.before 이고, 이미 축하한 레벨(stored)보다 높을 때만 표시
 */
export const decideMissionCelebration = (
  stored: number | null,
  before: number,
  after: number,
): CelebrationDecision => {
  if (after <= before) return { show: false, store: null };
  const seen = stored ?? before;
  if (after <= seen) return { show: false, store: null };
  return { show: true, from: Math.max(before, seen), to: after, store: after };
};

/**
 * B~D. 마이페이지 진입 (설계서 5.4)
 * - 저장값 없음(첫 진입·새 기기): 표시하지 않고 현재 레벨만 저장 → 기존 레벨 때문에 잘못 뜨지 않음
 * - 서버 레벨 > 저장값: 미션 화면에서 못 본 축하를 한 번 표시
 * - 그 외: 표시하지 않음
 */
export const decideEntryCelebration = (stored: number | null, serverLevel: number): CelebrationDecision => {
  if (stored === null) return { show: false, store: serverLevel };
  if (serverLevel > stored) return { show: true, from: stored, to: serverLevel, store: serverLevel };
  return { show: false, store: null };
};
