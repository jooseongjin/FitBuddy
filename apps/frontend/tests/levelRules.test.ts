// 레벨·XP·레벨업 축하 규칙 단위 테스트 — 실행: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCharacterProgress,
  decideEntryCelebration,
  decideMissionCelebration,
  getXpProgress,
  levelFromXp,
} from '../src/domain/levelRules.ts';

const TABLE = [0, 100, 300, 600]; // 테스트용 기준표 (최대 4레벨)

test('누적 XP → 레벨, 기준이 없으면 기존 레벨 유지', () => {
  assert.equal(levelFromXp(0, TABLE, 1), 1);
  assert.equal(levelFromXp(299, TABLE, 1), 2);
  assert.equal(levelFromXp(5000, TABLE, 1), 4);
  assert.equal(levelFromXp(5000, null, 8), 8);
});

test('레벨은 내려가지 않음 (기준표보다 기존 레벨이 높으면 유지)', () => {
  assert.equal(levelFromXp(150, TABLE, 3), 3);
});

test('진행 바: 진행 중 / 기준 준비 중 / 최고 레벨', () => {
  const progress = getXpProgress(buildCharacterProgress(200, 2, TABLE));
  assert.deepEqual(progress, { kind: 'progress', ratio: 0.5, remaining: 100 });
  assert.deepEqual(getXpProgress(buildCharacterProgress(200, 2, null)), { kind: 'pending' });
  assert.deepEqual(getXpProgress(buildCharacterProgress(700, 4, TABLE)), { kind: 'max' });
});

test('A. 미션 완료로 레벨이 오르면 축하, 저장값 갱신', () => {
  assert.deepEqual(decideMissionCelebration(8, 8, 9), { show: true, from: 8, to: 9, store: 9 });
});

test('A. 여러 레벨이 한 번에 오르면 한 번만 (8 → 10)', () => {
  assert.deepEqual(decideMissionCelebration(8, 8, 10), { show: true, from: 8, to: 10, store: 10 });
});

test('A. 레벨이 그대로거나 이미 축하한 레벨이면 표시 안 함', () => {
  assert.equal(decideMissionCelebration(8, 8, 8).show, false);
  assert.equal(decideMissionCelebration(10, 9, 10).show, false);
});

test('B. 마이페이지 첫 진입(저장값 없음)은 표시 없이 현재 레벨만 저장 — 기존 Lv.8 오표시 방지', () => {
  assert.deepEqual(decideEntryCelebration(null, 8), { show: false, store: 8 });
});

test('C. 서버 레벨이 저장값보다 높으면 한 번 표시', () => {
  assert.deepEqual(decideEntryCelebration(8, 9), { show: true, from: 8, to: 9, store: 9 });
});

test('D. 같은 레벨로 다시 들어오면 표시 안 함 (중복 방지)', () => {
  const first = decideEntryCelebration(8, 9);
  assert.equal(first.show, true);
  assert.deepEqual(decideEntryCelebration(first.store, 9), { show: false, store: null });
});
