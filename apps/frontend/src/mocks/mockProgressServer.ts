// 임시(mock) 서버 — 백엔드 API가 준비되기 전까지 레벨·XP·Streak·복구를 실제처럼 동작시킨다.
// - ProgressApi를 구현하므로 화면은 실제 API와 같은 방식으로 사용
// - 메모리에만 저장 (새로고침하면 초기값)
// - dev* 로 시작하는 함수는 /dev/ui 테스트 조작 전용. 실제 서비스 화면에서는 호출하지 않는다.

import { addDays, kstDateKey, type DateKey } from '../domain/kst.ts';
import { buildCharacterProgress, levelFromXp } from '../domain/levelRules.ts';
import {
  applyMissionComplete,
  applyRepair,
  toStreakState,
  validateRepair,
  type RepairErrorCode,
  type StreakRecord,
} from '../domain/streakRules.ts';
import {
  ApiError,
  type CharacterProgress,
  type MissionRewardResult,
  type Plan,
  type RepairResult,
  type StreakState,
} from '../api/progressTypes.ts';
import type { ProgressApi, RepairRequest } from '../api/progressApi.ts';
import { MOCK_POLICY } from './mockPolicy.ts';

export type FailMode = 'none' | 'next' | 'always';

export type StreakScenario =
  | 'kept_pending' // 어제까지 7일 연속, 오늘 미완료
  | 'kept_done' // 오늘까지 8일 연속
  | 'missed_one' // 어제 하루 빠짐 → 복구 가능
  | 'missed_two' // 이틀 이상 빠짐 → 복구 불가
  | 'monthly_used' // 어제 빠짐 + 이번 달 복구 횟수 소진
  | 'fresh'; // 기록 없음

type MockState = {
  totalXp: number;
  level: number;
  levelTableEnabled: boolean;
  plan: Plan;
  record: StreakRecord;
  /** 시간 이동 (일 단위 테스트) */
  dayOffset: number;
  /** KST 시각 고정 (위험 배너 테스트). null이면 실제 시각 */
  hourOverride: number | null;
  latencyMs: number;
  failMode: FailMode;
  /** 날짜별 완료한 미션 ID (같은 미션 중복 완료 방지, 목록 "완료됨" 표시) */
  missionLog: Record<DateKey, readonly string[]>;
};

const NO_MISSIONS: readonly string[] = [];

/** 시나리오별 오늘 완료한 미션 (오늘 완료 시나리오면 기존 화면처럼 '아침 스트레칭' 완료) */
const scenarioMissionLog = (scenario: StreakScenario, today: DateKey): MockState['missionLog'] =>
  scenario === 'kept_done' ? { [today]: ['1'] } : {};

const ERROR_MESSAGE: Record<RepairErrorCode | 'NETWORK_ERROR' | 'IDEMPOTENCY_KEY_REUSED', string> = {
  STREAK_NOT_BROKEN: '연속 기록이 이어지고 있어 복구할 필요가 없어요.',
  STREAK_NOT_REPAIRABLE: '이틀 이상 지나 기록을 복구할 수 없어요.',
  MISSED_DATE_MISMATCH: '날짜가 바뀌었어요. 화면을 새로 불러올게요.',
  ALREADY_REPAIRED: '이미 복구한 날짜예요.',
  MONTHLY_LIMIT_EXCEEDED: '이번 달 복구 횟수를 모두 썼어요.',
  PREMIUM_REQUIRED: '무료 복구는 Premium 사용자만 쓸 수 있어요.',
  NO_FREE_REPAIR: '무료 복구 횟수가 남아 있지 않아요.',
  REPAIR_COST_UNDEFINED: '복구 비용이 아직 정해지지 않았어요.',
  INSUFFICIENT_POINTS: 'FitPoint가 부족해요.',
  NETWORK_ERROR: '연결이 불안정해 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  IDEMPOTENCY_KEY_REUSED: '요청을 처리하지 못했어요. 다시 시도해 주세요.',
};

const ERROR_KEY = 'NETWORK_ERROR' as const;

const scenarioRecord = (scenario: StreakScenario, today: DateKey, plan: Plan): StreakRecord => {
  const daysEndingAt = (end: DateKey, count: number) => Array.from({ length: count }, (_, i) => addDays(end, -i)).reverse();
  switch (scenario) {
    case 'kept_done':
      return { currentStreak: 8, lastCompletedDate: today, completedDates: daysEndingAt(today, 8), repairs: [] };
    case 'missed_one': {
      const last = addDays(today, -2);
      return { currentStreak: 7, lastCompletedDate: last, completedDates: daysEndingAt(last, 7), repairs: [] };
    }
    case 'missed_two': {
      const last = addDays(today, -3);
      return { currentStreak: 7, lastCompletedDate: last, completedDates: daysEndingAt(last, 7), repairs: [] };
    }
    case 'monthly_used': {
      const last = addDays(today, -2);
      const limit = MOCK_POLICY.repair.monthlyLimit[plan];
      // 이번 달에 이미 쓴 복구 기록 (과거 날짜를 복구했다고 가정)
      const repairs = Array.from({ length: limit }, (_, i) => ({
        missedDate: addDays(today, -40 - i),
        method: 'points' as const,
        repairedOn: today,
      }));
      return { currentStreak: 7, lastCompletedDate: last, completedDates: daysEndingAt(last, 7), repairs };
    }
    case 'fresh':
      return { currentStreak: 0, lastCompletedDate: null, completedDates: [], repairs: [] };
    case 'kept_pending':
    default: {
      const last = addDays(today, -1);
      return { currentStreak: 7, lastCompletedDate: last, completedDates: daysEndingAt(last, 7), repairs: [] };
    }
  }
};

const initialState = (): MockState => {
  const today = kstDateKey(new Date());
  return {
    totalXp: 3200, // 임시: 기존 화면의 "LEVEL 08" 테스트 데이터와 맞춤
    level: 8,
    levelTableEnabled: true,
    plan: 'basic',
    // 기존 홈·미션 화면 예시(아침 스트레칭 완료, 8천 보 진행 중)와 맞춤: 오늘 이미 1개 완료
    record: scenarioRecord('kept_done', today, 'basic'),
    dayOffset: 0,
    hourOverride: null,
    latencyMs: 450,
    failMode: 'none',
    missionLog: scenarioMissionLog('kept_done', today),
  };
};

class MockProgressServer implements ProgressApi {
  readonly isMock = true;

  private state: MockState = initialState();
  private idempotency = new Map<string, { body: string; result: RepairResult }>();
  private listeners = new Set<() => void>();
  /** 공용 FP 잔액 읽기 (CharacterStoreProvider와 연결). 실제 서버에서는 서버가 잔액을 가짐 */
  private readBalance: () => number = () => 0;

  attachWallet(read: () => number) {
    this.readBalance = read;
  }

  // ---------- 시간 ----------
  now(): Date {
    const base = new Date(Date.now() + this.state.dayOffset * 24 * 60 * 60 * 1000);
    if (this.state.hourOverride === null) return base;
    const day = kstDateKey(base);
    return new Date(`${day}T${String(this.state.hourOverride).padStart(2, '0')}:00:00+09:00`);
  }

  private today(): DateKey {
    return kstDateKey(this.now());
  }

  private table() {
    return this.state.levelTableEnabled ? MOCK_POLICY.levelXpTable : null;
  }

  // ---------- 응답 지연·실패 흉내 ----------
  private async respond<T>(work: () => T): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, this.state.latencyMs));
    if (this.state.failMode !== 'none') {
      if (this.state.failMode === 'next') this.setState({ failMode: 'none' });
      throw new ApiError(ERROR_KEY, ERROR_MESSAGE.NETWORK_ERROR);
    }
    return work();
  }

  // ---------- ProgressApi ----------
  getCharacterProgress(): Promise<CharacterProgress> {
    return this.respond(() => buildCharacterProgress(this.state.totalXp, this.state.level, this.table()));
  }

  getStreak(): Promise<StreakState> {
    return this.respond(() => this.streakSnapshot());
  }

  repairStreak(request: RepairRequest): Promise<RepairResult> {
    const body = JSON.stringify({ missedDate: request.missedDate, method: request.method });
    return this.respond(() => {
      // 같은 요청 ID 재전송 → 저장된 결과 그대로 (FP 중복 차감 없음)
      const saved = this.idempotency.get(request.requestId);
      if (saved) {
        if (saved.body !== body) throw new ApiError('IDEMPOTENCY_KEY_REUSED', ERROR_MESSAGE.IDEMPOTENCY_KEY_REUSED);
        return saved.result;
      }
      const today = this.today();
      const balance = this.readBalance();
      const error = validateRepair(this.state.record, today, request, this.state.plan, MOCK_POLICY.repair, balance);
      if (error) {
        const details =
          error === 'INSUFFICIENT_POINTS'
            ? { required: MOCK_POLICY.repair.costPoints, balance }
            : error === 'MONTHLY_LIMIT_EXCEEDED'
              ? { resetsOn: this.streakSnapshot().repair.resetsOn }
              : undefined;
        throw new ApiError(error, ERROR_MESSAGE[error], details);
      }
      const record = applyRepair(this.state.record, today, request.missedDate, request.method);
      const spent = request.method === 'points' ? (MOCK_POLICY.repair.costPoints ?? 0) : 0;
      this.setState({ record });
      const result: RepairResult = { streak: this.streakSnapshot(), balance: balance - spent };
      this.idempotency.set(request.requestId, { body, result });
      return result;
    });
  }

  // ---------- 미션 완료 (실제로는 미션 API: POST /missions/{id}/complete) ----------
  /** 미션 완료: 포인트 적립 + XP 증가 + 레벨 재계산 + Streak 갱신 (설계서 8.3). 같은 날 같은 미션은 409 */
  completeMission(missionId: string, basePoint: number = MOCK_POLICY.missionBasePoint): Promise<MissionRewardResult> {
    return this.respond(() => {
      const today = this.today();
      const done = this.state.missionLog[today] ?? NO_MISSIONS;
      if (done.includes(missionId)) throw new ApiError('MISSION_ALREADY_COMPLETED', '이미 완료한 미션이에요.');
      const multiplier = this.state.plan === 'premium' ? MOCK_POLICY.premiumMultiplier : 1;
      const earnedPoint = Math.floor(basePoint * multiplier);
      const result = this.grantXp(earnedPoint, earnedPoint, true);
      this.setState({ missionLog: { ...this.state.missionLog, [today]: [...done, missionId] } });
      return result;
    });
  }

  /** 오늘 완료한 미션 ID (값이 바뀔 때만 새 배열 → 화면 구독에 사용) */
  todayCompletedMissionIds(): readonly string[] {
    return this.state.missionLog[this.today()] ?? NO_MISSIONS;
  }

  private devMissionSeq = 0;

  /** /dev/ui용: 매번 다른 미션을 완료한 것처럼 */
  devCompleteMission(): Promise<MissionRewardResult> {
    this.devMissionSeq += 1;
    return this.completeMission(`dev-${this.devMissionSeq}`);
  }

  /** XP만 바로 추가 (여러 레벨 상승 테스트용) */
  devAddXp(amount: number): MissionRewardResult {
    return this.grantXp(0, amount, false);
  }

  private grantXp(earnedPoint: number, earnedXp: number, countsAsMission: boolean): MissionRewardResult {
    const before = this.state.level;
    const totalXp = this.state.totalXp + earnedXp;
    const level = levelFromXp(totalXp, this.table(), before);
    let record = this.state.record;
    let streakUpdate: MissionRewardResult['streak'];
    if (countsAsMission) {
      const applied = applyMissionComplete(record, this.today());
      record = applied.record;
      streakUpdate = applied.update;
    } else {
      // XP만 추가 (Streak 변화 없음)
      const display = toStreakState(record, this.now(), this.today(), this.state.plan, MOCK_POLICY.repair).currentStreak;
      streakUpdate = { increased: false, previous: display, current: display, restarted: false };
    }
    this.setState({ totalXp, level, record });
    return {
      earnedPoint,
      earnedXp,
      level: { before, after: level },
      totalEarnedXp: totalXp,
      streak: streakUpdate,
      balance: this.readBalance() + earnedPoint,
    };
  }

  // ---------- /dev/ui 조작 ----------
  devSetScenario(scenario: StreakScenario) {
    const today = this.today();
    this.setState({
      record: scenarioRecord(scenario, today, this.state.plan),
      // 오늘 완료한 미션도 시나리오에 맞춤 (오늘 완료 시나리오만 1개 완료)
      missionLog: { ...this.state.missionLog, [today]: scenarioMissionLog(scenario, today)[today] ?? NO_MISSIONS },
    });
  }

  devSetPlan(plan: Plan) {
    this.setState({ plan });
  }

  devSetLevelTableEnabled(enabled: boolean) {
    this.setState({ levelTableEnabled: enabled });
  }

  /** 레벨·XP를 직접 지정 (축하 없이 상태만 바꿈) */
  devSetLevel(level: number, totalXp: number) {
    this.setState({ level, totalXp });
  }

  /** 최고 레벨 바로 아래로 (기준표 기준) */
  devSetNearMaxLevel() {
    const table = MOCK_POLICY.levelXpTable;
    const level = table.length - 1;
    this.setState({ level, totalXp: table[level] - 40, levelTableEnabled: true });
  }

  devAdvanceDays(days: number) {
    this.setState({ dayOffset: this.state.dayOffset + days });
  }

  devSetHour(hour: number | null) {
    this.setState({ hourOverride: hour });
  }

  devSetFailMode(failMode: FailMode) {
    this.setState({ failMode });
  }

  devSetLatency(latencyMs: number) {
    this.setState({ latencyMs });
  }

  devReset() {
    this.state = initialState();
    this.idempotency.clear();
    this.emit();
  }

  devSnapshot() {
    return {
      ...this.state,
      today: this.today(),
      now: this.now().toISOString(),
      policy: MOCK_POLICY,
    };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- 내부 ----------
  private streakSnapshot(): StreakState {
    return toStreakState(this.state.record, this.now(), this.today(), this.state.plan, MOCK_POLICY.repair);
  }

  private setState(patch: Partial<MockState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

/** 앱 전체에서 하나만 사용 */
export const mockProgressServer = new MockProgressServer();
export type { MockProgressServer };
