// mock 서버 동작 테스트 (복구 중복 요청·FP 차감·XP 분리) — 실행: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockProgressServer } from '../src/mocks/mockProgressServer.ts';
import { MOCK_POLICY } from '../src/mocks/mockPolicy.ts';
import { ApiError } from '../src/api/progressTypes.ts';

let wallet = 2480;

beforeEach(() => {
  mockProgressServer.devReset();
  mockProgressServer.devSetLatency(0);
  wallet = 2480;
  mockProgressServer.attachWallet(() => wallet);
});

const missedDate = async () => (await mockProgressServer.getStreak()).repair.missedDate!;

test('같은 요청 ID로 다시 보내면 결과를 그대로 돌려주고 FP는 한 번만 차감', async () => {
  mockProgressServer.devSetScenario('missed_one');
  const date = await missedDate();
  const first = await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-1' });
  wallet = first.balance; // 화면이 잔액을 반영했다고 가정
  const again = await mockProgressServer.repairStreak({ missedDate: date, method: 'points', requestId: 'req-1' });
  assert.equal(first.balance, 2480 - (MOCK_POLICY.repair.costPoints ?? 0));
  assert.deepEqual(again, first);
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
  assert.equal(second.balance, wallet + MOCK_POLICY.missionBasePoint);
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

test('초기 상태는 기존 화면 예시와 같음: 오늘 아침 스트레칭 완료, 연속 기록 오늘 완료', async () => {
  assert.deepEqual(mockProgressServer.todayCompletedMissionIds(), ['1']);
  const streak = await mockProgressServer.getStreak();
  assert.equal(streak.todayCompleted, true);
});

test('XP 기준 미정이면 레벨은 그대로, 진행 바 값은 null', async () => {
  mockProgressServer.devSetLevelTableEnabled(false);
  const result = mockProgressServer.devAddXp(5000);
  assert.equal(result.level.after, result.level.before);
  const progress = await mockProgressServer.getCharacterProgress();
  assert.equal(progress.nextLevelXp, null);
});
