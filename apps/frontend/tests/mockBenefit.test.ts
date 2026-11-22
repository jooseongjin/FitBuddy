// mock 서버의 구독·기프티콘 규칙이 백엔드(services/subscription.js, rewards.js)와 같은지 — 실행: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_INITIAL_BALANCE, mockProgressServer } from '../src/mocks/mockProgressServer.ts';
import { MOCK_POLICY } from '../src/mocks/mockPolicy.ts';
import { ApiError } from '../src/api/progressTypes.ts';

beforeEach(() => {
  mockProgressServer.devReset();
  mockProgressServer.devSetLatency(0);
});

const hasCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;

test('구독 전: Basic, 결제 기록 없음, 가격 4,900원·30일', async () => {
  const info = await mockProgressServer.getSubscription();
  assert.equal(info.plan, 'basic');
  assert.equal(info.payments.length, 0);
  assert.equal(info.price, 4900);
  assert.equal(info.periodDays, 30);
  assert.equal(info.pointMultiplier, 1);
});

test('구독 성공: Premium, 만료일 약 30일 뒤, 거래 ID는 MOCK-, 복구 횟수 2+2', async () => {
  const result = await mockProgressServer.subscribePremium();
  assert.equal(result.plan, 'premium');
  assert.match(result.payment?.transactionId ?? '', /^MOCK-/);
  const days = (new Date(result.expiresAt!).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 29.9 && days <= 30);
  const info = await mockProgressServer.getSubscription();
  assert.equal(info.pointMultiplier, 1.5);
  const streak = await mockProgressServer.getStreak();
  assert.equal(streak.repair.freeRemaining, 2);
  assert.equal(streak.repair.pointsRemaining, 2);
});

test('이미 Premium이면 ALREADY_SUBSCRIBED, 결제 기록은 늘지 않음', async () => {
  await mockProgressServer.subscribePremium();
  await assert.rejects(mockProgressServer.subscribePremium(), hasCode('ALREADY_SUBSCRIBED'));
  assert.equal((await mockProgressServer.getSubscription()).payments.length, 1);
});

test('결제 실패: PAYMENT_FAILED, 플랜은 그대로, 실패 기록 1건', async () => {
  await assert.rejects(mockProgressServer.subscribePremium('fail'), hasCode('PAYMENT_FAILED'));
  const info = await mockProgressServer.getSubscription();
  assert.equal(info.plan, 'basic');
  assert.equal(info.payments.length, 1);
  assert.equal(info.payments[0].status, 'failed');
  assert.equal(info.payments[0].transactionId, null);
});

test('기프티콘 목록: 올리브영·배민 2개, 각 3,000 FP, 예시 이미지 키', async () => {
  const list = await mockProgressServer.getRewards();
  assert.deepEqual(
    list.items.map((item) => [item.name, item.requiredPoint, item.imageKey]),
    [
      ['올리브영 상품권 5,000원', 3000, 'gifticon_oliveyoung_5000'],
      ['배민 상품권 5,000원', 3000, 'gifticon_baemin_5000'],
    ],
  );
  assert.equal(list.balance, MOCK_INITIAL_BALANCE);
});

test('교환 성공: 잔액 3,000 감소, 보관함 1건, 재고 1 감소, 내역에 기프티콘 교환', async () => {
  mockProgressServer.devSetBalance(5000);
  const reward = MOCK_POLICY.rewards[0];
  const result = await mockProgressServer.redeemReward(reward.id);
  assert.equal(result.balance, 2000);
  assert.equal((await mockProgressServer.getRedemptions()).length, 1);
  const item = (await mockProgressServer.getRewards()).items.find((entry) => entry.id === reward.id)!;
  assert.equal(item.stock, reward.stock - 1);
  const history = await mockProgressServer.getPointHistory(1, 1);
  assert.equal(history.items[0].source, 'reward_redeem');
  assert.equal(history.items[0].amount, -3000);
});

test('교환 오류: 포인트 부족·품절·없는 상품 (잔액·보관함 변화 없음)', async () => {
  mockProgressServer.devSetBalance(1000);
  const reward = MOCK_POLICY.rewards[0];
  await assert.rejects(mockProgressServer.redeemReward(reward.id), hasCode('INSUFFICIENT_POINTS'));
  mockProgressServer.devSetBalance(5000);
  mockProgressServer.devSetRewardStock(reward.id, 0);
  await assert.rejects(mockProgressServer.redeemReward(reward.id), hasCode('OUT_OF_STOCK'));
  assert.equal((await mockProgressServer.getRewards()).items.find((entry) => entry.id === reward.id)?.soldOut, true);
  await assert.rejects(mockProgressServer.redeemReward(99999), hasCode('REWARD_NOT_FOUND'));
  assert.equal(mockProgressServer.balance, 5000);
  assert.equal((await mockProgressServer.getRedemptions()).length, 0);
});
