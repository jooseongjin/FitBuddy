// 임시(mock) 서버 — 백엔드 API가 준비되기 전까지 레벨·XP·Streak·복구·FitPoint를 실제처럼 동작시킨다.
// - ProgressApi를 구현하므로 화면은 실제 API와 같은 방식으로 사용
// - FitPoint 잔액과 거래 내역(Point_transactions)도 여기서 관리 → 미션 적립·상점 구매·복구 차감이 한 곳에서 맞춰짐
// - 탭 단위 저장(sessionStorage): 같은 탭에서는 새로고침해도 유지(중복 보상 방지), 탭을 새로 열면 초기값으로 시작 (시연용)
// - dev* 로 시작하는 함수는 /dev/ui 테스트 조작 전용. 실제 서비스 화면에서는 호출하지 않는다.

import { addDays, formatMonthDay, kstDateKey, type DateKey } from '../domain/kst.ts';
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
  type PointHistoryPage,
  type PointSource,
  type PointTransaction,
  type RepairResult,
  type StreakState,
} from '../api/progressTypes.ts';
import type { ProgressApi, RepairRequest } from '../api/progressApi.ts';
import { MOCK_POLICY } from './mockPolicy.ts';
import { TODAY_MISSIONS } from '../data/missions.ts';

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
  /** FitPoint 잔액 (= 거래 내역 amount 합계) */
  balance: number;
  /** FitPoint 거래 내역 (오래된 순) */
  ledger: PointTransaction[];
  /** 시간 이동 (일 단위 테스트) */
  dayOffset: number;
  /** KST 시각 고정 (위험 배너 테스트). null이면 실제 시각 */
  hourOverride: number | null;
  latencyMs: number;
  failMode: FailMode;
  /** 날짜별 완료한 미션 ID (같은 미션 중복 완료 방지, 목록 "완료됨" 표시) */
  missionLog: Record<DateKey, readonly string[]>;
  /** 날짜별 미션 진행도 (미션 ID → 현재 값). 없으면 미션 데이터의 startProgress */
  missionProgress: Record<DateKey, Readonly<Record<string, number>>>;
};

const NO_MISSIONS: readonly string[] = [];
const NO_PROGRESS: Readonly<Record<string, number>> = {};
const STORAGE_KEY = 'fb.mock.progress.v1';

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

/** KST 기준 날짜 + 시각 → ISO 문자열 (+09:00) */
const kstIso = (day: DateKey, hour: number, minute = 0) =>
  `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;

/** 지금 시각을 KST ISO 문자열로 */
const nowKstIso = (now: Date) => {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.toISOString().slice(0, 19)}+09:00`;
};

// 기존 홈·미션 화면 예시(오늘의 미션 3개)와 같은 이름·포인트로 지난 기록을 만든다
const SEED_MISSIONS = [
  { title: '아침 스트레칭', amount: 40, hour: 8 },
  { title: '가볍게 8천 보', amount: 120, hour: 13 },
  { title: '스쿼트 루틴', amount: 80, hour: 19 },
] as const;

/**
 * 초기 거래 내역 — 시연용 예시. Streak 초기값(어제까지 7일 연속)과 맞춰
 * 지난 7일은 하루 3개 미션 완료. 오늘은 아직 보상 받은 미션 없음. 잔액 = 합계
 */
const seedLedger = (today: DateKey): PointTransaction[] => {
  const items: Omit<PointTransaction, 'id'>[] = [];
  // 시연용 여유 잔액 +1,000: 연속 기록이 시작되기 전(8일 전은 쉰 날) 지난 기록
  //   13일 전 아침 스트레칭(40) + 12~9일 전 하루 3개(240 × 4) = 1,000
  items.push({ source: 'mission_complete', amount: 40, createdAt: kstIso(addDays(today, -13), 8), title: '아침 스트레칭' });
  for (let back = 12; back >= 9; back -= 1) {
    const day = addDays(today, -back);
    SEED_MISSIONS.forEach((mission) =>
      items.push({ source: 'mission_complete', amount: mission.amount, createdAt: kstIso(day, mission.hour), title: mission.title }),
    );
  }
  // 연속 기록 7일 (어제까지)
  for (let back = 7; back >= 1; back -= 1) {
    const day = addDays(today, -back);
    SEED_MISSIONS.forEach((mission) =>
      items.push({ source: 'mission_complete', amount: mission.amount, createdAt: kstIso(day, mission.hour), title: mission.title }),
    );
  }
  return items.map((item, index) => ({ ...item, id: index + 1 }));
};

const sumLedger = (ledger: PointTransaction[]) => ledger.reduce((sum, item) => sum + item.amount, 0);

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
  const ledger = seedLedger(today);
  return {
    totalXp: 3200, // 임시: 기존 화면의 "LEVEL 08" 테스트 데이터와 맞춤
    level: 8,
    levelTableEnabled: true,
    plan: 'basic',
    // 시연 기본값: 어제까지 7일 연속, 오늘은 아침 스트레칭 목표만 달성(보상 대기) → 보상을 받으면 8일 연속
    record: scenarioRecord('kept_pending', today, 'basic'),
    balance: sumLedger(ledger),
    ledger,
    dayOffset: 0,
    hourOverride: null,
    latencyMs: 450,
    failMode: 'none',
    missionLog: {},
    missionProgress: {},
  };
};

/** 초기 잔액 (/dev/ui "기본" 버튼, 테스트에서 사용) */
export const MOCK_INITIAL_BALANCE = sumLedger(seedLedger(kstDateKey(new Date())));

// ---------- 탭 단위 저장 (새로고침해도 유지, 새 탭은 초기값) ----------
type Saved = { state: MockState; idempotency: [string, { body: string; result: RepairResult }][] };

/** 브라우저가 아니거나(테스트) 저장소를 쓸 수 없으면 null */
const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

// 이전 버전이 브라우저(localStorage)에 계속 남기던 값은 정리
try {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
} catch {
  // 무시
}

const loadSaved = (): Saved | null => {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    // 형식이 다르면(이전 버전 저장값) 버리고 초기값 사용
    if (!saved?.state || !Array.isArray(saved.state.ledger) || typeof saved.state.balance !== 'number' || !saved.state.missionProgress) {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
};

class MockProgressServer implements ProgressApi {
  readonly isMock = true;

  private state: MockState;
  private idempotency: Map<string, { body: string; result: RepairResult }>;
  private listeners = new Set<() => void>();

  constructor() {
    const saved = loadSaved();
    this.state = saved?.state ?? initialState();
    // 시연 중 실수로 남은 실패 모드는 새로고침하면 해제
    this.state = { ...this.state, failMode: 'none' };
    this.idempotency = new Map(saved?.idempotency ?? []);
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

  // ---------- FitPoint ----------
  /** 현재 잔액 (동기). 공용 FP 상태가 이 값을 그대로 표시 */
  get balance(): number {
    return this.state.balance;
  }

  /** 잔액 변경 + 거래 내역 1건 추가 (amount: 적립 +, 사용 −) */
  private addTransaction(source: PointSource, amount: number, title: string | null): number {
    const id = (this.state.ledger.at(-1)?.id ?? 0) + 1;
    const transaction: PointTransaction = { id, source, amount, createdAt: nowKstIso(this.now()), title };
    const balance = this.state.balance + amount;
    this.setState({ balance, ledger: [...this.state.ledger, transaction] });
    return balance;
  }

  /**
   * 상점 구매 차감 (API-09 POST /character/customize action=purchase 의 mock).
   * 잔액이 부족하면 아무것도 바꾸지 않고 INSUFFICIENT_POINTS. 성공하면 새 잔액
   * 상점 화면이 즉시 결과를 써야 해서 지연 없이 동기로 처리
   */
  purchase(price: number, itemName: string): number {
    if (price < 0) throw new ApiError('INVALID_PRICE', '가격이 올바르지 않아요.');
    if (this.state.balance < price) {
      throw new ApiError('INSUFFICIENT_POINTS', ERROR_MESSAGE.INSUFFICIENT_POINTS, { required: price, balance: this.state.balance });
    }
    if (price === 0) return this.state.balance;
    return this.addTransaction('shop_purchase', -price, itemName);
  }

  getBalance(): Promise<number> {
    return this.respond(() => this.state.balance);
  }

  getPointHistory(page: number, size: number): Promise<PointHistoryPage> {
    return this.respond(() => {
      const newestFirst = [...this.state.ledger].reverse();
      const start = Math.max(0, (page - 1) * size);
      return { items: newestFirst.slice(start, start + size), hasMore: start + size < newestFirst.length };
    });
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
      const balance = this.state.balance;
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
      this.setState({ record });
      const spent = request.method === 'points' ? (MOCK_POLICY.repair.costPoints ?? 0) : 0;
      if (spent > 0) this.addTransaction('streak_repair', -spent, `${formatMonthDay(request.missedDate)} 기록 복구`);
      const result: RepairResult = { streak: this.streakSnapshot(), balance: this.state.balance };
      this.idempotency.set(request.requestId, { body, result });
      this.persist();
      return result;
    });
  }

  // ---------- 미션 완료 (실제로는 미션 API: POST /missions/{id}/complete) ----------
  /** 미션 완료: 포인트 적립 + XP 증가 + 레벨 재계산 + Streak 갱신 (설계서 8.3). 같은 날 같은 미션은 409 */
  completeMission(
    missionId: string,
    basePoint: number = MOCK_POLICY.missionBasePoint,
    title: string | null = null,
  ): Promise<MissionRewardResult> {
    return this.respond(() => {
      const today = this.today();
      const done = this.state.missionLog[today] ?? NO_MISSIONS;
      if (done.includes(missionId)) throw new ApiError('MISSION_ALREADY_COMPLETED', '이미 완료한 미션이에요.');
      // 목표를 달성하지 않은 미션은 보상 불가 (실제 서버도 409로 거절해야 함)
      const mission = TODAY_MISSIONS.find((item) => item.id === missionId);
      if (mission && this.missionCurrent(missionId) < mission.target) {
        throw new ApiError('MISSION_NOT_ACHIEVED', '아직 목표를 달성하지 않았어요. 목표를 채운 뒤 보상을 받아 주세요.');
      }
      const multiplier = this.state.plan === 'premium' ? MOCK_POLICY.premiumMultiplier : 1;
      const earnedPoint = Math.floor(basePoint * multiplier);
      // 완료 기록을 먼저 남겨, 같은 요청이 겹쳐 와도 두 번 지급하지 않음
      this.setState({ missionLog: { ...this.state.missionLog, [today]: [...done, missionId] } });
      return this.grantXp(earnedPoint, earnedPoint, true, title);
    });
  }

  /** 오늘 완료한 미션 ID (값이 바뀔 때만 새 배열 → 화면 구독에 사용) */
  todayCompletedMissionIds(): readonly string[] {
    return this.state.missionLog[this.today()] ?? NO_MISSIONS;
  }

  /** 오늘 미션 진행도 (지정한 미션만, 값이 바뀔 때만 새 객체 → 화면 구독에 사용) */
  todayMissionProgress(): Readonly<Record<string, number>> {
    return this.state.missionProgress[this.today()] ?? NO_PROGRESS;
  }

  /** 미션 현재 진행도 (지정값이 없으면 미션 데이터의 시작값) */
  missionCurrent(missionId: string): number {
    const value = this.todayMissionProgress()[missionId];
    return value ?? TODAY_MISSIONS.find((item) => item.id === missionId)?.startProgress ?? 0;
  }

  /** /dev/ui: 미션 진행도 지정 */
  devSetMissionProgress(missionId: string, value: number) {
    const today = this.today();
    this.setState({ missionProgress: { ...this.state.missionProgress, [today]: { ...this.todayMissionProgress(), [missionId]: value } } });
  }

  /** /dev/ui: 오늘 미션 목표 모두 달성 (보상 대기 상태로) */
  devAchieveAllMissions() {
    const today = this.today();
    const all = Object.fromEntries(TODAY_MISSIONS.map((mission) => [mission.id, mission.target]));
    this.setState({ missionProgress: { ...this.state.missionProgress, [today]: all } });
  }

  /** /dev/ui: 오늘 미션 진행도를 시작값으로 */
  devResetMissionProgress() {
    const today = this.today();
    const rest = { ...this.state.missionProgress };
    delete rest[today];
    this.setState({ missionProgress: rest });
  }

  private devMissionSeq = 0;

  /** /dev/ui용: 매번 다른 미션을 완료한 것처럼 */
  devCompleteMission(): Promise<MissionRewardResult> {
    this.devMissionSeq += 1;
    return this.completeMission(`dev-${Date.now()}-${this.devMissionSeq}`, MOCK_POLICY.missionBasePoint, '테스트 미션');
  }

  /** XP만 바로 추가 (여러 레벨 상승 테스트용) */
  devAddXp(amount: number): MissionRewardResult {
    return this.grantXp(0, amount, false, null);
  }

  private grantXp(earnedPoint: number, earnedXp: number, countsAsMission: boolean, title: string | null): MissionRewardResult {
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
    if (earnedPoint > 0) this.addTransaction('mission_complete', earnedPoint, title);
    return {
      earnedPoint,
      earnedXp,
      level: { before, after: level },
      totalEarnedXp: totalXp,
      streak: streakUpdate,
      balance: this.state.balance,
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

  /** 첫 사용자: Lv.1, XP·잔액 0, 거래 내역·연속 기록 없음 */
  devSetFirstUser() {
    this.setState({
      totalXp: 0,
      level: 1,
      balance: 0,
      ledger: [],
      record: scenarioRecord('fresh', this.today(), this.state.plan),
      missionLog: {},
    });
  }

  devSetPlan(plan: Plan) {
    this.setState({ plan });
  }

  /** 잔액을 직접 지정 (부족·충분 테스트). 차이만큼 내역은 남기지 않음 → 내역 합계와 달라질 수 있음 */
  devSetBalance(balance: number) {
    this.setState({ balance });
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
    this.persist();
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
    this.persist();
    this.emit();
  }

  private persist() {
    try {
      const saved: Saved = { state: this.state, idempotency: [...this.idempotency.entries()].slice(-20) };
      storage()?.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // 저장소 사용 불가: 메모리 값만 유지
    }
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

/** 앱 전체에서 하나만 사용 */
export const mockProgressServer = new MockProgressServer();
export type { MockProgressServer };
