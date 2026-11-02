import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { progressApi } from '../api/progressClient';
import { ApiError, type CharacterProgress, type MissionRewardResult, type StreakState } from '../api/progressTypes';
import type { RepairRequest } from '../api/progressApi';
import { decideEntryCelebration, decideMissionCelebration, type CelebrationDecision } from '../domain/levelRules';
import { readCelebratedLevel, writeCelebratedLevel } from '../lib/celebrationStorage';
import { useCharacterStore } from './characterStore';
import { ProgressStoreContext, type Celebration, type LoadStatus, type ProgressStore } from './progressStore';
import { LevelUpCelebrationHost } from '../components/progress/LevelUpCelebrationHost';

// 날짜가 바뀌었거나 이미 처리된 복구 요청 → 최신 상태를 다시 불러옴
const REFRESH_ON_ERROR = new Set(['MISSED_DATE_MISMATCH', 'STREAK_NOT_BROKEN', 'ALREADY_REPAIRED', 'STREAK_NOT_REPAIRABLE', 'MONTHLY_LIMIT_EXCEEDED']);

type WalletAware = { attachWallet?: (read: () => number) => void };

const loadProgress = () => Promise.all([progressApi.getCharacterProgress(), progressApi.getStreak()]);

/**
 * 레벨·XP·Streak 공용 상태. CharacterStoreProvider 안쪽에 둔다 (FP 잔액 공유)
 * 레벨업 축하 모달도 여기서 띄워, 어느 화면에서 미션 보상을 반영해도 같은 규칙으로 표시된다.
 */
export const ProgressStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { fitPoint, setFitPoint } = useCharacterStore();
  const [character, setCharacter] = useState<CharacterProgress | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // 보상 모달 등 다른 화면 위에 바로 겹치지 않도록 잠시 미뤄 둔 축하
  const [deferredCelebration, setDeferredCelebration] = useState<Celebration | null>(null);

  // mock 서버가 공용 FP 잔액을 읽을 수 있게 연결 (실제 서버는 잔액을 서버가 가짐)
  const fitPointRef = useRef(fitPoint);
  useEffect(() => {
    fitPointRef.current = fitPoint;
  }, [fitPoint]);
  useEffect(() => {
    (progressApi as WalletAware).attachWallet?.(() => fitPointRef.current);
  }, []);

  const applyLoaded = useCallback((nextCharacter: CharacterProgress, nextStreak: StreakState) => {
    setCharacter(nextCharacter);
    setStreak(nextStreak);
    setStatus('ready');
    setErrorMessage(null);
  }, []);

  const applyLoadError = useCallback((error: unknown) => {
    setErrorMessage(error instanceof ApiError ? error.message : '정보를 불러오지 못했어요.');
    // 이미 받은 값이 있으면 그대로 보여주고, 처음 불러오기 실패만 오류 화면
    setStatus((previous) => (previous === 'ready' ? 'ready' : 'error'));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [nextCharacter, nextStreak] = await loadProgress();
      applyLoaded(nextCharacter, nextStreak);
    } catch (error) {
      applyLoadError(error);
    }
  }, [applyLoaded, applyLoadError]);

  // 처음 한 번 불러오기 (화면을 떠난 뒤 도착한 응답은 무시)
  useEffect(() => {
    let cancelled = false;
    loadProgress().then(
      ([nextCharacter, nextStreak]) => {
        if (!cancelled) applyLoaded(nextCharacter, nextStreak);
      },
      (error: unknown) => {
        if (!cancelled) applyLoadError(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [applyLoaded, applyLoadError]);

  const applyDecision = useCallback((decision: CelebrationDecision, defer = false) => {
    if (decision.store !== null) writeCelebratedLevel(decision.store);
    if (!decision.show) return;
    const next = { from: decision.from, to: decision.to };
    if (defer) setDeferredCelebration(next);
    else setCelebration(next);
  }, []);

  const releaseCelebration = useCallback(() => {
    if (!deferredCelebration) return;
    setCelebration(deferredCelebration);
    setDeferredCelebration(null);
  }, [deferredCelebration]);

  const repairStreak = useCallback(
    async (request: RepairRequest) => {
      try {
        const result = await progressApi.repairStreak(request);
        setStreak(result.streak);
        setFitPoint(result.balance);
        return result;
      } catch (error) {
        if (error instanceof ApiError && REFRESH_ON_ERROR.has(error.code)) void refresh();
        throw error;
      }
    },
    [refresh, setFitPoint],
  );

  const applyMissionReward = useCallback(
    (result: MissionRewardResult, options?: { deferCelebration?: boolean }) => {
      setFitPoint(result.balance);
      setCharacter((previous) =>
        previous ? { ...previous, level: result.level.after, totalEarnedXp: result.totalEarnedXp } : previous,
      );
      // A. 미션 완료 응답: 실제 레벨 상승이 확인됐을 때만
      const stored = readCelebratedLevel();
      applyDecision(
        decideMissionCelebration(stored.level, result.level.before, result.level.after),
        options?.deferCelebration ?? false,
      );
      // 진행 바 기준값·주간 기록은 서버 값으로 다시 맞춤
      void refresh();
    },
    [applyDecision, refresh, setFitPoint],
  );

  const checkCelebrationOnEntry = useCallback(() => {
    if (!character) return;
    const stored = readCelebratedLevel();
    // F. 저장소를 쓸 수 없으면 진입 축하는 건너뜀 (오표시 방지)
    if (!stored.available) return;
    applyDecision(decideEntryCelebration(stored.level, character.level));
  }, [applyDecision, character]);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const value = useMemo<ProgressStore>(
    () => ({
      character,
      streak,
      status,
      errorMessage,
      isMock: progressApi.isMock,
      refresh,
      repairStreak,
      applyMissionReward,
      releaseCelebration,
      celebration,
      dismissCelebration,
      checkCelebrationOnEntry,
    }),
    [character, streak, status, errorMessage, refresh, repairStreak, applyMissionReward, releaseCelebration, celebration, dismissCelebration, checkCelebrationOnEntry],
  );

  return (
    <ProgressStoreContext.Provider value={value}>
      {children}
      <LevelUpCelebrationHost />
    </ProgressStoreContext.Provider>
  );
};
