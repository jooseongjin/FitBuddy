// 구독(모의 결제)과 기프티콘 즉시 교환 테스트 (npm run migrate:reset 후 실행)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const pool = require('../src/db');

let server, base;
let seq = 0;
const call = (path, method = 'GET', data, token) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

test.before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
test.after(async () => { server.close(); await pool.end(); });

async function newUser({ balance = 0 } = {}) {
  seq += 1;
  const id = `sb${Date.now().toString().slice(-7)}${seq}`;
  const signup = await call('/api/v1/auth/signup', 'POST', { user_id: id, email: `${id}@t.com`, password: 'Passw0rd!', nickname: '구독' });
  assert.equal(signup.status, 201);
  const n = signup.json.data.user_number;
  const login = await call('/api/v1/auth/login', 'POST', { user_id: id, password: 'Passw0rd!' });
  if (balance > 0) {
    await pool.query("INSERT INTO Point_transactions (Users_user_number, source, amount) VALUES (?, 'mission_complete', ?)", [n, balance]);
  }
  return { n, token: login.json.token };
}
const subscribe = (u, mock_result) => call('/api/v1/subscription', 'POST', { plan: 'premium', ...(mock_result ? { mock_result } : {}) }, u.token);
const balanceOf = async (u) => (await call('/api/v1/points/balance', 'GET', null, u.token)).json.data.balance;
const payments = async (u) => (await pool.query('SELECT * FROM Payment_logs WHERE Users_user_number = ? ORDER BY payment_id', [u.n]))[0];

// 테스트용 상품: 시드 데이터와 겹치지 않게 직접 만든다
async function newReward({ point = 3000, stock = 5, premium = false, active = true } = {}) {
  seq += 1;
  const [r] = await pool.query(
    'INSERT INTO Rewards (reward_name, required_point, stock, is_premium_only, is_active, image_key) VALUES (?, ?, ?, ?, ?, ?)',
    [`테스트 기프티콘 ${seq}`, point, stock, premium, active, `gifticon_test_${seq}`],
  );
  return r.insertId;
}
const redeem = (u, rewardId) => call(`/api/v1/rewards/${rewardId}/redeem`, 'POST', null, u.token);
const stockOf = async (rewardId) => (await pool.query('SELECT stock FROM Rewards WHERE reward_id = ?', [rewardId]))[0][0].stock;

// ---------- 구독 · 모의 결제 ----------
test('구독: 가입 직후에는 Basic이고 결제 기록이 없다', async () => {
  const u = await newUser();
  const r = await call('/api/v1/subscription', 'GET', null, u.token);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.plan, 'basic');
  assert.equal(r.json.data.expires_at, null);
  assert.equal(r.json.data.point_multiplier, 1);
  assert.deepEqual(r.json.data.payments, []);
});

test('구독: 모의 결제 성공 시 Premium 적용, 만료일 설정, 결제 기록(success) 저장', async () => {
  const u = await newUser();
  const r = await subscribe(u);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.plan, 'premium');
  assert.equal(r.json.data.payment.pay_status, 'success');
  assert.match(r.json.data.payment.pg_transaction_id, /^MOCK-/);
  const days = (new Date(r.json.data.expires_at) - Date.now()) / 86400000;
  assert.ok(days > 29 && days <= 30, `만료일 약 30일 뒤여야 함: ${days}`);

  const me = await call('/api/v1/subscription', 'GET', null, u.token);
  assert.equal(me.json.data.plan, 'premium');
  assert.equal(me.json.data.point_multiplier, 1.5);
  const logs = await payments(u);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].pay_status, 'success');
  assert.ok(logs[0].Subscriptions_subscriptions_id);
});

test('구독: 모의 결제 실패는 402이고 구독은 그대로이며 failed 기록만 남는다', async () => {
  const u = await newUser();
  const r = await subscribe(u, 'fail');
  assert.equal(r.status, 402);
  assert.equal(r.json.code, 'PAYMENT_FAILED');
  assert.equal((await call('/api/v1/subscription', 'GET', null, u.token)).json.data.plan, 'basic');
  const logs = await payments(u);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].pay_status, 'failed');
  assert.equal(logs[0].pg_transaction_id, null);
  // 실패 뒤 다시 시도하면 성공할 수 있다
  assert.equal((await subscribe(u)).status, 200);
});

test('구독: 이미 Premium이면 409이고 결제 기록이 늘지 않는다', async () => {
  const u = await newUser();
  assert.equal((await subscribe(u)).status, 200);
  const again = await subscribe(u);
  assert.equal(again.status, 409);
  assert.equal(again.json.code, 'ALREADY_SUBSCRIBED');
  assert.equal((await payments(u)).length, 1);
});

test('구독: 동시에 두 번 요청해도 한 번만 결제된다', async () => {
  const u = await newUser();
  const results = await Promise.all([subscribe(u), subscribe(u)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await payments(u)).length, 1);
});

test('구독: 만료되면 Basic으로 돌아가고 다시 구독할 수 있다', async () => {
  const u = await newUser();
  assert.equal((await subscribe(u)).status, 200);
  await pool.query('UPDATE Subscriptions SET expires_at = ? WHERE Users_user_number = ?', [new Date(Date.now() - 1000), u.n]);
  assert.equal((await call('/api/v1/subscription', 'GET', null, u.token)).json.data.plan, 'basic');
  assert.equal((await subscribe(u)).status, 200);
  assert.equal((await call('/api/v1/subscription', 'GET', null, u.token)).json.data.plan, 'premium');
});

test('구독: 인증 없으면 401, 잘못된 plan은 400', async () => {
  assert.equal((await call('/api/v1/subscription', 'POST', { plan: 'premium' })).status, 401);
  const u = await newUser();
  assert.equal((await call('/api/v1/subscription', 'POST', { plan: 'gold' }, u.token)).status, 400);
});

// ---------- 기프티콘 교환 ----------
test('기프티콘: 시드에 올리브영·배민 상품권이 노출되고 기존 샘플은 숨겨진다', async () => {
  const u = await newUser({ balance: 100 });
  const r = await call('/api/v1/rewards', 'GET', null, u.token);
  assert.equal(r.status, 200);
  const names = r.json.data.items.map((i) => i.reward_name);
  assert.ok(names.some((n) => n.includes('올리브영 상품권')));
  assert.ok(names.some((n) => n.includes('배민 상품권')));
  assert.ok(!names.includes('커피 쿠폰 응모'));
  const olive = r.json.data.items.find((i) => i.reward_name.includes('올리브영'));
  assert.equal(olive.image_key, 'gifticon_oliveyoung_5000');
  assert.equal(olive.locked, false);
  assert.equal(olive.sold_out, false);
  assert.equal(r.json.data.balance, 100);
});

test('기프티콘: 교환하면 포인트 차감, 재고 감소, 교환 기록, 원장 기록이 함께 반영된다', async () => {
  const u = await newUser({ balance: 5000 });
  const rewardId = await newReward({ point: 3000, stock: 5 });
  const r = await redeem(u, rewardId);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.redemption_status, 'completed');
  assert.equal(r.json.data.balance, 2000);
  assert.equal(r.json.data.reward.image_key, `gifticon_test_${seq}`);
  assert.equal(await balanceOf(u), 2000);
  assert.equal(await stockOf(rewardId), 4);
  const [[ledger]] = await pool.query(
    "SELECT amount, ref_id FROM Point_transactions WHERE Users_user_number = ? AND source = 'reward_redeem'",
    [u.n],
  );
  assert.equal(ledger.amount, -3000);
  assert.equal(ledger.ref_id, r.json.data.redemption_id);

  const box = await call('/api/v1/rewards/redemptions', 'GET', null, u.token);
  assert.equal(box.json.data.items.length, 1);
  assert.equal(box.json.data.items[0].reward.reward_id, rewardId);
  const history = await call('/api/v1/points/history', 'GET', null, u.token);
  assert.ok(history.json.data.items.some((i) => i.source === 'reward_redeem' && i.title.startsWith('테스트 기프티콘')));
});

test('기프티콘: 포인트 부족이면 409이고 아무것도 바뀌지 않는다', async () => {
  const u = await newUser({ balance: 2999 });
  const rewardId = await newReward({ point: 3000, stock: 5 });
  const r = await redeem(u, rewardId);
  assert.equal(r.status, 409);
  assert.equal(r.json.code, 'INSUFFICIENT_POINTS');
  assert.equal(await balanceOf(u), 2999);
  assert.equal(await stockOf(rewardId), 5);
  assert.equal((await call('/api/v1/rewards/redemptions', 'GET', null, u.token)).json.data.items.length, 0);
});

test('기프티콘: 재고 0이면 409(OUT_OF_STOCK)', async () => {
  const u = await newUser({ balance: 5000 });
  const rewardId = await newReward({ stock: 0 });
  const r = await redeem(u, rewardId);
  assert.equal(r.status, 409);
  assert.equal(r.json.code, 'OUT_OF_STOCK');
  assert.equal(await balanceOf(u), 5000);
});

test('기프티콘: Premium 전용 상품은 Basic이 403, 구독하면 교환할 수 있다', async () => {
  const u = await newUser({ balance: 5000 });
  const rewardId = await newReward({ premium: true });
  const list = await call('/api/v1/rewards', 'GET', null, u.token);
  assert.equal(list.json.data.items.find((i) => i.reward_id === rewardId).locked, true);
  const blocked = await redeem(u, rewardId);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.code, 'PREMIUM_REQUIRED');
  assert.equal(await balanceOf(u), 5000);

  assert.equal((await subscribe(u)).status, 200);
  assert.equal((await redeem(u, rewardId)).status, 200);
});

test('기프티콘: 없는 상품·숨긴 상품은 404, 잘못된 id는 400, 인증 없으면 401', async () => {
  const u = await newUser({ balance: 5000 });
  assert.equal((await redeem(u, 99999999)).status, 404);
  assert.equal((await redeem(u, await newReward({ active: false }))).status, 404);
  assert.equal((await call('/api/v1/rewards/abc/redeem', 'POST', null, u.token)).status, 400);
  assert.equal((await call('/api/v1/rewards/1/redeem', 'POST')).status, 401);
});

test('기프티콘: 잔액이 한 번 분만 있으면 동시에 두 번 눌러도 한 번만 교환된다 (잔액 음수 금지)', async () => {
  const u = await newUser({ balance: 3000 });
  const rewardId = await newReward({ point: 3000, stock: 5 });
  const results = await Promise.all([redeem(u, rewardId), redeem(u, rewardId)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await balanceOf(u), 0);
  assert.equal(await stockOf(rewardId), 4);
});

test('기프티콘: 재고 1개를 두 사용자가 동시에 교환하면 한 명만 성공한다 (재고 음수 금지)', async () => {
  const a = await newUser({ balance: 5000 });
  const b = await newUser({ balance: 5000 });
  const rewardId = await newReward({ point: 3000, stock: 1 });
  const results = await Promise.all([redeem(a, rewardId), redeem(b, rewardId)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await stockOf(rewardId), 0);
  const [[count]] = await pool.query('SELECT COUNT(*) c FROM Reward_redemptions WHERE Rewards_reward_id = ?', [rewardId]);
  assert.equal(count.c, 1);
});
