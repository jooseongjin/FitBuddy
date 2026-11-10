// mock 서버 동작 테스트 (복구 중복 요청·FP 차감·XP 분리) — 실행: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_INITIAL_BALANCE, mockProgressServer } from '../src/mocks/mockProgressServer.ts';
import { MOCK_POLICY } from '../src/mocks/mockPolicy.ts';
import { ApiError } from '../src/api/progressTypes.ts';

beforeEach(() => {
  mockProgressServer.devReset();
  mockProgressServer.devSetLatency(0);
  // 보상 지급 테스트를 위해 오늘 미션 목표는 모두 달성한 상태로 시작 (기본값 테스트는 따로 초기화)
  mockProgressServer.devAchieveAllMissions();
});

/** 거래 내역 전체 합계 (잔액과 같아야 함) */
const ledgerSum = async () => {
  const page = await mockProgressServer.getPointHistory(1, 1000);
  return page.items.reduce((sum, item) => sum + item.amount, 0);
};

const missedDate = async () => (await mockProgressServer.getStreak()).repair.missedDate!;

test('같은 요청 ID로 다시 보내면 결과를 그대로 돌려주고 FP는 한 번만 차감', async () => {
  mockProgressServer.devSetScenario('missed_one');
  const date = await missedDate();
  const first = await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-1' });
  const again = await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-1' });
  assert.equal(first.balance, MOCK_INITIAL_BALANCE - (MOCK_POLICY.repair.costPoints ?? 0));
  assert.deepEqual(again, first);
  assert.equal(mockProgressServer.balance, first.balance);
});

test('같은 요청 ID에 다른 내용이면 IDEMPOTENCY_KEY_REUSED', async () => {
  mockProgressServer.devSetPlan('premium');
  mockProgressServer.devSetScenario('missed_one');
  const date = await missedDate();
  await mockProgressServer.repairStreak({ missedDate: date, method: 'free', requestId: 'req-2' });
  await assert.rejects(
    mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-2' }),
    (error: unknown) => error instanceof ApiError && error.code === 'IDEMPOTENCY_KEY_REUSED',
  );
});

test('실패한 요청은 저장되지 않아 같은 ID로 다시 시도하면 성공', async () => {
  mockProgressServer.devSetScenario('missed_one');
  const date = await missedDate();
  mockProgressServer.devSetFailMode('next');
  await assert.rejects(mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-3' }));
  const retry = await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-3' });
  assert.equal(retry.streak.repair.status, 'none');
  assert.equal(retry.streak.currentStreak, 7);
});

test('복구·FP 사용은 XP와 레벨을 바꾸지 않음', async () => {
  mockProgressServer.devSetScenario('missed_one');
  const before = await mockProgressServer.getCharacterProgress();
  await mockProgressServer.repairStreak({ missedDate: await missedDate(), method: 'points', requestId: 'req-4' });
  const after = await mockProgressServer.getCharacterProgress();
  assert.deepEqual(after, before);
});

test('미션 완료: XP 누적으로 자동 레벨업, Streak은 하루 한 번만 +1', async () => {
  mockProgressServer.devSetScenario('kept_pending'); // 오늘 아직 미션 안 함
  mockProgressServer.devSetLevel(8, 3590); // 다음 레벨 기준 3,600 (임시 기준표)
  const first = await mockProgressServer.devCompleteMission();
  assert.deepEqual(first.level, { before: 8, after: 9 });
  assert.equal(first.streak.increased, true);
  const second = await mockProgressServer.devCompleteMission();
  assert.equal(second.streak.increased, false);
  assert.equal(second.balance, first.balance + MOCK_POLICY.missionBasePoint);
});

test('같은 날 같은 미션을 두 번 완료하면 MISSION_ALREADY_COMPLETED, 완료 목록에 기록', async () => {
  mockProgressServer.devSetScenario('kept_pending');
  assert.deepEqual(mockProgressServer.todayCompletedMissionIds(), []);
  const first = await mockProgressServer.completeMission('2', 120);
  assert.equal(first.earnedPoint, 120);
  assert.equal(first.streak.increased, true);
  assert.deepEqual(mockProgressServer.todayCompletedMissionIds(), ['2']);
  await assert.rejects(
    mockProgressServer.completeMission('2', 120),
    (error: unknown) => error instanceof ApiError && error.code === 'MISSION_ALREADY_COMPLETED',
  );
  // 다른 미션은 완료 가능하지만 Streak은 그대로 (하루 최대 +1)
  const other = await mockProgressServer.completeMission('3', 80);
  assert.equal(other.streak.increased, false);
});

test('시연 기본값: 아침 스트레칭은 목표 달성·보상 대기, 나머지는 진행 중, 오늘 Streak 미완료', async () => {
  mockProgressServer.devReset();
  assert.deepEqual(mockProgressServer.todayCompletedMissionIds(), []);
  assert.equal(mockProgressServer.missionCurrent('1'), 10); // 10/10분
  assert.ok(mockProgressServer.missionCurrent('3') < 20); // 12/20회
  const streak = await mockProgressServer.getStreak();
  assert.equal(streak.todayCompleted, false);
  assert.equal(streak.currentStreak, 7);
});

test('목표를 채우지 않은 미션은 보상을 받을 수 없음 (MISSION_NOT_ACHIEVED, 잔액 그대로)', async () => {
  mockProgressServer.devReset();
  mockProgressServer.devSetLatency(0);
  const start = mockProgressServer.balance;
  await assert.rejects(
    mockProgressServer.completeMission('3', 80),
    (error: unknown) => error instanceof ApiError && error.code === 'MISSION_NOT_ACHIEVED',
  );
  assert.equal(mockProgressServer.balance, start);
  // 목표를 채우면 받을 수 있음
  mockProgressServer.devSetMissionProgress('3', 20);
  const result = await mockProgressServer.completeMission('3', 80);
  assert.equal(result.earnedPoint, 80);
});

test('XP 기준 미정이면 레벨은 그대로, 진행 바 값은 null', async () => {
  mockProgressServer.devSetLevelTableEnabled(false);
  const result = mockProgressServer.devAddXp(5000);
  assert.equal(result.level.after, result.level.before);
  const progress = await mockProgressServer.getCharacterProgress();
  assert.equal(progress.nextLevelXp, null);
});

test('초기 잔액은 거래 내역 합계와 같음', async () => {
  assert.equal(mockProgressServer.balance, MOCK_INITIAL_BALANCE);
  assert.equal(await ledgerSum(), MOCK_INITIAL_BALANCE);
});

test('복구(−)·미션 적립(+)·상점 구매(−)가 내역에 부호대로 남고 잔액 = 내역 합계', async () => {
  mockProgressServer.devSetScenario('missed_one');
  const start = mockProgressServer.balance;
  const cost = MOCK_POLICY.repair.costPoints ?? 0;
  const date = await missedDate();
  // 오늘 미션을 먼저 하면 어제 복구가 불가하므로 복구 → 미션 → 구매 순서
  await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'r-ledger' });
  await mockProgressServer.completeMission('2', 120, '가볍게 8천 보');
  mockProgressServer.purchase(480, '민트 후드티');
  const { items } = await mockProgressServer.getPointHistory(1, 3);
  assert.deepEqual(
    items.map((item) => [item.source, item.amount, item.title]),
    [
      ['shop_purchase', -480, '민트 후드티'],
      ['mission_complete', 120, '가볍게 8천 보'],
      ['streak_repair', -cost, `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 기록 복구`],
    ],
  );
  assert.equal(mockProgressServer.balance, start - cost + 120 - 480);
  assert.equal(mockProgressServer.balance, await ledgerSum());
});

test('잔액이 부족하면 구매하지 않고 잔액·내역 그대로', async () => {
  mockProgressServer.devSetFirstUser();
  assert.throws(
    () => mockProgressServer.purchase(240, '별 머리핀'),
    (error: unknown) => error instanceof ApiError && error.code === 'INSUFFICIENT_POINTS',
  );
  assert.equal(mockProgressServer.balance, 0);
  assert.deepEqual((await mockProgressServer.getPointHistory(1, 20)).items, []);
});

test('같은 미션 완료 요청이 겹쳐 와도 보상은 한 번만', async () => {
  mockProgressServer.devSetScenario('kept_pending');
  const start = mockProgressServer.balance;
  const results = await Promise.allSettled([
    mockProgressServer.completeMission('3', 80),
    mockProgressServer.completeMission('3', 80),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(mockProgressServer.balance, start + 80);
});

test('첫 사용자: 잔액 0, 내역 없음, Lv.1', async () => {
  mockProgressServer.devSetFirstUser();
  const page = await mockProgressServer.getPointHistory(1, 20);
  assert.deepEqual(page, { items: [], hasMore: false });
  assert.equal((await mockProgressServer.getCharacterProgress()).level, 1);
});

test('내역은 최신순·페이지 단위', async () => {
  const first = await mockProgressServer.getPointHistory(1, 5);
  const second = await mockProgressServer.getPointHistory(2, 5);
  assert.equal(first.items.length, 5);
  assert.equal(first.hasMore, true);
  assert.ok(first.items[0].id > first.items[4].id);
  assert.ok(first.items[4].id > second.items[0].id);
});
