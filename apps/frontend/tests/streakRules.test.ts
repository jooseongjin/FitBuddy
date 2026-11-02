// Streak 규칙 단위 테스트 — 실행: npm test  (Node 내장 테스트 러너, 추가 설치 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, kstDateKey, kstHour, nextMonthFirst, weekOf } from '../src/domain/kst.ts';
import {
  applyMissionComplete,
  applyRepair,
  buildWeek,
  getDisplayStreak,
  getRepairInfo,
  shouldShowRiskBanner,
  validateRepair,
  type RepairPolicy,
  type StreakRecord,
} from '../src/domain/streakRules.ts';

const POLICY: RepairPolicy = { costPoints: 300, monthlyLimit: { basic: 1, premium: 3 }, premiumFreePerMonth: 1 };
const TODAY = '2026-11-18';

const record = (last: string | null, current: number, extra: Partial<StreakRecord> = {}): StreakRecord => ({
  currentStreak: current,
  lastCompletedDate: last,
  completedDates: last ? [last] : [],
  repairs: [],
  ...extra,
});

test('KST 날짜: UTC 14:59는 같은 날, 15:00은 다음 날 (23:59 / 00:00 경계)', () => {
  assert.equal(kstDateKey(new Date('2026-11-01T14:59:59Z')), '2026-11-01');
  assert.equal(kstDateKey(new Date('2026-11-01T15:00:00Z')), '2026-11-02');
  assert.equal(kstHour(new Date('2026-11-01T11:00:00Z')), 20);
});

test('날짜 도우미: 월말·연말 넘김, 월요일 시작 주', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(nextMonthFirst('2026-12-15'), '2027-01-01');
  assert.deepEqual(weekOf('2026-11-01'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
});

test('어제까지 이어졌으면 +1', () => {
  const { record: next, update } = applyMissionComplete(record(addDays(TODAY, -1), 7), TODAY);
  assert.deepEqual(update, { increased: true, previous: 7, current: 8, restarted: false });
  assert.equal(next.lastCompletedDate, TODAY);
});

test('하루에 여러 번 완료해도 하루 최대 +1', () => {
  const first = applyMissionComplete(record(addDays(TODAY, -1), 7), TODAY);
  const second = applyMissionComplete(first.record, TODAY);
  assert.equal(second.update.increased, false);
  assert.equal(second.record.currentStreak, 8);
});

test('끊긴 뒤 완료하면 1일부터 다시 시작 (restarted)', () => {
  const { update } = applyMissionComplete(record(addDays(TODAY, -3), 7), TODAY);
  assert.deepEqual(update, { increased: true, previous: 0, current: 1, restarted: true });
});

test('첫 기록은 1일이지만 "다시 시작" 연출은 없음', () => {
  const { update } = applyMissionComplete(record(null, 0), TODAY);
  assert.equal(update.current, 1);
  assert.equal(update.restarted, false);
});

test('표시 연속 일수: 어제·오늘까지면 유지, 그 이전이면 0', () => {
  assert.equal(getDisplayStreak(record(addDays(TODAY, -1), 7), TODAY), 7);
  assert.equal(getDisplayStreak(record(addDays(TODAY, -2), 7), TODAY), 0);
});

test('복구 상태: 하루 빠짐=available, 이틀 이상=expired, 이어짐=none', () => {
  assert.equal(getRepairInfo(record(addDays(TODAY, -2), 7), TODAY, 'basic', POLICY).status, 'available');
  assert.equal(getRepairInfo(record(addDays(TODAY, -3), 7), TODAY, 'basic', POLICY).status, 'expired');
  assert.equal(getRepairInfo(record(addDays(TODAY, -1), 7), TODAY, 'basic', POLICY).status, 'none');
});

test('이번 달 횟수를 다 쓰면 monthly_limit, 다음 달 1일에 다시 생김', () => {
  const used = record(addDays(TODAY, -2), 7, {
    repairs: [{ missedDate: '2026-11-03', method: 'points', repairedOn: '2026-11-04' }],
  });
  const info = getRepairInfo(used, TODAY, 'basic', POLICY);
  assert.equal(info.status, 'monthly_limit');
  assert.equal(info.resetsOn, '2026-12-01');
  // 다음 달이 되면 지난달 기록은 세지 않음
  const nextMonth = '2026-12-03';
  const sameRecordNextMonth = { ...used, lastCompletedDate: addDays(nextMonth, -2) };
  assert.equal(getRepairInfo(sameRecordNextMonth, nextMonth, 'basic', POLICY).status, 'available');
});

test('복구 검증: FP 부족, Basic 무료 요청, 날짜 불일치, 중복 복구', () => {
  const broken = record(addDays(TODAY, -2), 7);
  const yesterday = addDays(TODAY, -1);
  assert.equal(validateRepair(broken, TODAY, { missedDate: yesterday, method: 'points' }, 'basic', POLICY, 100), 'INSUFFICIENT_POINTS');
  assert.equal(validateRepair(broken, TODAY, { missedDate: yesterday, method: 'free' }, 'basic', POLICY, 5000), 'PREMIUM_REQUIRED');
  assert.equal(validateRepair(broken, TODAY, { missedDate: addDays(TODAY, -2), method: 'points' }, 'basic', POLICY, 5000), 'MISSED_DATE_MISMATCH');
  assert.equal(validateRepair(broken, TODAY, { missedDate: yesterday, method: 'free' }, 'premium', POLICY, 0), null);
  const repaired = applyRepair(broken, TODAY, yesterday, 'points');
  // 복구 후에는 이어진 상태 → 같은 날짜 재요청은 거절
  assert.equal(validateRepair(repaired, TODAY, { missedDate: yesterday, method: 'points' }, 'basic', POLICY, 5000), 'STREAK_NOT_BROKEN');
});

test('TRD 시나리오: 5일차 완료 → 6일차 미완료 → 7일차 복구 → 7일차 완료 = 6', () => {
  const day5 = '2026-11-05';
  const day7 = '2026-11-07';
  let current = record(day5, 5);
  // 7일차: 6일차 복구 (연속 일수 그대로)
  current = applyRepair(current, day7, '2026-11-06', 'points');
  assert.equal(current.currentStreak, 5);
  assert.equal(current.lastCompletedDate, '2026-11-06');
  // 7일차 미션 완료 → +1 (복구와 별개)
  const { record: after, update } = applyMissionComplete(current, day7);
  assert.equal(after.currentStreak, 6);
  assert.equal(update.increased, true);
});

test('B9 추천안: 오늘 미션을 먼저 완료하면 어제 복구 불가', () => {
  const broken = record(addDays(TODAY, -2), 7);
  const { record: afterMission } = applyMissionComplete(broken, TODAY);
  assert.equal(getRepairInfo(afterMission, TODAY, 'basic', POLICY).status, 'none');
});

test('Premium 무료 횟수는 월 한도 안에서만', () => {
  const broken = record(addDays(TODAY, -2), 7, {
    repairs: [{ missedDate: '2026-11-02', method: 'free', repairedOn: '2026-11-03' }],
  });
  const info = getRepairInfo(broken, TODAY, 'premium', POLICY);
  assert.equal(info.freeRemaining, 0);
  assert.equal(info.monthlyRemaining, 2);
});

test('위험 배너: 유지 중 + 오늘 미완료 + 20시 이후에만', () => {
  const base = { currentStreak: 7, todayCompleted: false, isBroken: false };
  assert.equal(shouldShowRiskBanner({ ...base, serverNow: '2026-11-18T19:59:00+09:00' }, 20), false);
  assert.equal(shouldShowRiskBanner({ ...base, serverNow: '2026-11-18T20:00:00+09:00' }, 20), true);
  assert.equal(shouldShowRiskBanner({ ...base, todayCompleted: true, serverNow: '2026-11-18T21:00:00+09:00' }, 20), false);
  assert.equal(shouldShowRiskBanner({ ...base, isBroken: true, serverNow: '2026-11-18T21:00:00+09:00' }, 20), false);
});

test('주간 기록: 오늘 포함 최근 7일, 달성·복구·미달성·오늘 상태', () => {
  const rec = record('2026-11-17', 4, {
    completedDates: ['2026-11-13', '2026-11-14', '2026-11-16', '2026-11-17'],
    repairs: [{ missedDate: '2026-11-15', method: 'points', repairedOn: '2026-11-16' }],
  });
  const week = buildWeek(rec, TODAY); // 11-12 ~ 11-18(오늘)
  assert.deepEqual(
    week.map((day) => day.date),
    ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'],
  );
  assert.deepEqual(
    week.map((day) => day.status),
    ['missed', 'done', 'done', 'repaired', 'done', 'done', 'today_pending'],
  );
});
