// Streak 복구 월 한도 테스트: 무료 복구와 포인트 복구를 따로 센다 (npm run migrate:reset 후 실행)
//   Basic   : 무료 월 1회 + 포인트 월 1회
//   Premium : 무료 월 2회 + 포인트 월 2회
//   매월 1일 00:00 KST에 초기화되고 이월되지 않는다. 복구 대상 날짜는 "어제" 하루뿐이다.
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

const kstYesterday = () => new Date(Date.now() + 9 * 3600 * 1000 - 24 * 3600 * 1000).toISOString().slice(0, 10);

// 새 사용자를 만들고 "어제 하루 놓친" 상태로 맞춘다.
//   used: 이번 달 이미 쓴 복구  / old: 지난달(40일 전)에 쓴 복구  / balance: 보유 포인트
async function setup({ plan = 'basic', used = [], old = [], balance = 1000 } = {}) {
  seq += 1;
  const id = `sr${Date.now().toString().slice(-7)}${seq}`;
  const signup = await call('/api/v1/auth/signup', 'POST', { user_id: id, email: `${id}@t.com`, password: 'Passw0rd!', nickname: '복구' });
  assert.equal(signup.status, 201);
  const n = signup.json.data.user_number;
  const login = await call('/api/v1/auth/login', 'POST', { user_id: id, password: 'Passw0rd!' });
  const token = login.json.token;
  if (plan === 'premium') {
    await pool.query(
      `INSERT INTO Subscriptions (Users_user_number, plan, sub_status, expires_at)
       VALUES (?, 'premium', 'active', NOW() + INTERVAL 30 DAY)
       ON DUPLICATE KEY UPDATE plan = 'premium', sub_status = 'active', expires_at = NOW() + INTERVAL 30 DAY`,
      [n],
    );
  }
  await pool.query(
    `UPDATE Streaks SET current_streak = 3,
            last_completed_date = DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR) - INTERVAL 2 DAY
      WHERE Users_user_number = ?`,
    [n],
  );
  if (balance > 0) {
    await pool.query("INSERT INTO Point_transactions (Users_user_number, source, amount) VALUES (?, 'mission_complete', ?)", [n, balance]);
  }
  let day = 0;
  for (const method of used) {
    day += 1;
    await pool.query('INSERT INTO Streak_repairs (Users_user_number, missed_date, repair_method) VALUES (?, ?, ?)', [n, `2020-01-${String(day).padStart(2, '0')}`, method]);
  }
  for (const method of old) {
    day += 1;
    await pool.query(
      'INSERT INTO Streak_repairs (Users_user_number, missed_date, repair_method, created_at) VALUES (?, ?, ?, NOW() - INTERVAL 40 DAY)',
      [n, `2020-01-${String(day).padStart(2, '0')}`, method],
    );
  }
  return { n, token };
}
const repair = (u, method) => call('/api/v1/streak/repair', 'POST', { missed_date: kstYesterday(), method }, u.token);
const balanceOf = async (u) => (await call('/api/v1/points/balance', 'GET', null, u.token)).json.data.balance;
const repairInfo = async (u) => (await call('/api/v1/streak', 'GET', null, u.token)).json.data.repair;
const rowCount = async (u) => (await pool.query('SELECT COUNT(*) c FROM Streak_repairs WHERE Users_user_number = ?', [u.n]))[0][0].c;

test('한도: Basic은 무료 1 + 포인트 1, Premium은 무료 2 + 포인트 2로 조회된다', async () => {
  const basic = await repairInfo(await setup({ plan: 'basic' }));
  assert.deepEqual(
    [basic.free_remaining, basic.points_remaining, basic.monthly_remaining, basic.free_limit, basic.points_limit],
    [1, 1, 2, 1, 1],
  );
  const premium = await repairInfo(await setup({ plan: 'premium' }));
  assert.deepEqual(
    [premium.free_remaining, premium.points_remaining, premium.monthly_remaining, premium.free_limit, premium.points_limit],
    [2, 2, 4, 2, 2],
  );
});

test('Basic도 무료 복구를 쓸 수 있고 포인트는 차감되지 않는다', async () => {
  const u = await setup({ plan: 'basic', balance: 1000 });
  const r = await repair(u, 'free');
  assert.equal(r.status, 200);
  assert.equal(await balanceOf(u), 1000);
  const [[ledger]] = await pool.query("SELECT COUNT(*) c FROM Point_transactions WHERE Users_user_number = ? AND source = 'streak_repair'", [u.n]);
  assert.equal(ledger.c, 0);
});

test('Basic: 무료를 이미 썼어도 포인트 복구는 별개로 1회 가능하다', async () => {
  const u = await setup({ plan: 'basic', used: ['free'] });
  assert.equal((await repair(u, 'free')).status, 409);
  const r = await repair(u, 'points');
  assert.equal(r.status, 200);
  assert.equal(await balanceOf(u), 700);
});

test('Basic: 포인트를 이미 썼어도 무료 복구는 별개로 1회 가능하다', async () => {
  const u = await setup({ plan: 'basic', used: ['points'] });
  const blocked = await repair(u, 'points');
  assert.equal(blocked.status, 409);
  assert.equal(blocked.json.code, 'MONTHLY_LIMIT_EXCEEDED');
  assert.equal((await repair(u, 'free')).status, 200);
});

test('Basic: 무료·포인트를 모두 쓰면 monthly_limit 이고 복구는 409', async () => {
  const u = await setup({ plan: 'basic', used: ['free', 'points'] });
  const info = await repairInfo(u);
  assert.equal(info.status, 'monthly_limit');
  assert.equal(info.monthly_remaining, 0);
  const free = await repair(u, 'free');
  assert.equal(free.status, 409); assert.equal(free.json.code, 'NO_FREE_REPAIR');
  const points = await repair(u, 'points');
  assert.equal(points.status, 409); assert.equal(points.json.code, 'MONTHLY_LIMIT_EXCEEDED');
  assert.equal(await balanceOf(u), 1000);
});

test('Premium: 무료 2회를 쓰면 무료는 막히고 포인트는 별개로 가능하다', async () => {
  const u = await setup({ plan: 'premium', used: ['free', 'free'] });
  const free = await repair(u, 'free');
  assert.equal(free.status, 409); assert.equal(free.json.code, 'NO_FREE_REPAIR');
  assert.equal((await repair(u, 'points')).status, 200);
  assert.equal(await balanceOf(u), 700);
});

test('Premium: 무료 1회만 썼으면 무료가 아직 남아 있다', async () => {
  const u = await setup({ plan: 'premium', used: ['free'] });
  const info = await repairInfo(u);
  assert.equal(info.free_remaining, 1);
  assert.equal(info.points_remaining, 2);
  assert.equal((await repair(u, 'free')).status, 200);
});

test('Premium: 포인트 2회를 쓰면 포인트는 막히고 무료는 가능하다', async () => {
  const u = await setup({ plan: 'premium', used: ['points', 'points'] });
  const points = await repair(u, 'points');
  assert.equal(points.status, 409); assert.equal(points.json.code, 'MONTHLY_LIMIT_EXCEEDED');
  assert.equal((await repair(u, 'free')).status, 200);
});

test('Premium: 무료 2 + 포인트 2를 모두 쓰면 monthly_limit', async () => {
  const u = await setup({ plan: 'premium', used: ['free', 'free', 'points', 'points'] });
  const info = await repairInfo(u);
  assert.equal(info.status, 'monthly_limit');
  assert.equal(info.monthly_remaining, 0);
  assert.equal((await repair(u, 'free')).status, 409);
  assert.equal((await repair(u, 'points')).status, 409);
});

test('이월 없음: 지난달에 쓴 복구는 이번 달 한도에 포함되지 않는다', async () => {
  const basic = await setup({ plan: 'basic', old: ['free', 'points'] });
  const info = await repairInfo(basic);
  assert.equal(info.free_remaining, 1);
  assert.equal(info.points_remaining, 1);
  assert.equal((await repair(basic, 'free')).status, 200);
});

test('포인트 부족이면 포인트 복구는 409(INSUFFICIENT_POINTS)이고 아무것도 기록되지 않는다', async () => {
  const u = await setup({ plan: 'basic', balance: 100 });
  const r = await repair(u, 'points');
  assert.equal(r.status, 409); assert.equal(r.json.code, 'INSUFFICIENT_POINTS');
  assert.equal(await rowCount(u), 0);
  assert.equal(await balanceOf(u), 100);
  assert.equal((await repair(u, 'free')).status, 200);
});

test('같은 날짜는 두 번 복구할 수 없다 (어제 하루만 복구 대상)', async () => {
  const u = await setup({ plan: 'premium' });
  assert.equal((await repair(u, 'free')).status, 200);
  const again = await repair(u, 'free');
  assert.equal(again.status, 409);
  assert.equal(await rowCount(u), 1);
});
