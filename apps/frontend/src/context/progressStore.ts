import { createContext, useContext } from 'react';
import type { CharacterProgress, MissionRewardResult, RepairResult, StreakState } from '../api/progressTypes.ts';
import type { RepairRequest } from '../api/progressApi.ts';

export type LoadStatus = 'loading' | 'ready' | 'error';

export type Celebration = { from: number; to: number };

/**
 * 레벨·XP·Streak 공용 상태 (설계서 4.1)
 * - FP는 characterStore(상점과 공유)에, XP·레벨·Streak은 여기에 따로 둔다 → 상점 구매로 XP가 바뀌지 않음
 * - 화면은 이 상태만 사용하고 API를 직접 부르지 않는다
 */
export type ProgressStore = {
  character: CharacterProgress | null;
  streak: StreakState | null;
  status: LoadStatus;
  errorMessage: string | null;
  /** mock API 사용 중이면 true → "임시 값" 표시 */
  isMock: boolean;
  refresh: () => Promise<void>;
  /** Streak 복구. 성공하면 Streak·FP 잔액을 갱신 */
  repairStreak: (request: RepairRequest) => Promise<RepairResult>;
  /**
   * 미션 완료 응답 반영 (팀원 미션 화면 연동용)
   * FP 잔액·XP·레벨·Streak을 갱신하고, 레벨이 올랐으면 축하 모달을 띄운다
   */
  applyMissionReward: (result: MissionRewardResult, options?: { deferCelebration?: boolean }) => void;
  /** deferCelebration으로 미뤄 둔 레벨업 축하를 띄움 (예: 보상 모달을 닫은 뒤) */
  releaseCelebration: () => void;
  /** 레벨업 축하 (설계서 5.4 규칙을 통과한 경우에만 값이 있음) */
  celebration: Celebration | null;
  dismissCelebration: () => void;
  /** 마이페이지 진입 시 축하 여부 판단 (B~D). 화면 진입마다 한 번만 호출 */
  checkCelebrationOnEntry: () => void;
};

export const ProgressStoreContext = createContext<ProgressStore | null>(null);

export const useProgress = (): ProgressStore => {
  const store = useContext(ProgressStoreContext);
  if (!store) throw new Error('useProgress는 ProgressStoreProvider 안에서만 사용할 수 있습니다.');
  return store;
};
