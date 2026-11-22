// 레벨·XP·Streak API 인터페이스 (설계서 4.2)
// 화면 → 공용 상태(progressStore) → ProgressApi 순서로만 접근한다.
// 구현을 바꿔도(mock ↔ 실제 서버) 화면 코드는 바뀌지 않는다.

import type {
  CharacterProgress,
  PointHistoryPage,
  RepairMethod,
  RepairResult,
  StreakState,
} from './progressTypes.ts';
import type { DateKey } from '../domain/kst.ts';

export type RepairRequest = {
  missedDate: DateKey;
  method: RepairMethod;
  /** 확인 버튼을 누를 때 한 번 만든 UUID. 재시도 때는 같은 값을 보냄 (Idempotency-Key) */
  requestId: string;
};

export interface ProgressApi {
  /** mock 구현이면 true → 화면에 "임시 값" 표시 */
  readonly isMock: boolean;
  /** GET /api/v1/character (API-08) */
  getCharacterProgress(): Promise<CharacterProgress>;
  /** GET /api/v1/streak (API-10) */
  getStreak(): Promise<StreakState>;
  /** POST /api/v1/streak/repair (API-11) */
  repairStreak(request: RepairRequest): Promise<RepairResult>;
  /** GET /api/v1/points/balance (API-06) */
  getBalance(): Promise<number>;
  /** GET /api/v1/points/history?page=&size= (API-07). page는 1부터, 최신순 */
  getPointHistory(page: number, size: number): Promise<PointHistoryPage>;
}

/** 요청 ID 생성 (오래된 브라우저 대비) */
export const createRequestId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
