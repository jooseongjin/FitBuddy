// 통합 테스트: 추천 미션 / 미션 완료 / 포인트 잔액 (npm run migrate:reset 후 실행)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const pool = require('../src/db');

let server, base, token, userNumber, missions;
const uid = 'm' + Date.now().toString().slice(-8);
const call = (path, method = 'GET', data, tk = token) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) },
    body: data ? JSON.stringify(data) : undefined }).then(async (r) => ({ status: r.status, json: await r.json() }));

test.before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
test.after(async () => { server.close(); await pool.end(); });

test('준비: 가입/로그인', async () => {
  const s = await call('/api/v1/auth/signup', 'POST', { userId: uid, password: 'Passw0rd!', email: `${uid}@t.com`, nickname: '미션러' }, null);
  userNumber = s.json.userNumber;
  const l = await call('/api/v1/auth/login', 'POST', { userId: uid, password: 'Passw0rd!' }, null);
  token = l.json.accessToken;
});
test('인증 없으면 401', async () => {
  assert.equal((await call('/api/v1/missions/recommended', 'GET', null, null)).status, 401);
  assert.equal((await call('/api/v1/points/balance', 'GET', null, null)).status, 401);
});
test('온보딩 전 추천 → 409 ONBOARDING_REQUIRED', async () => {
  const r = await call('/api/v1/missions/recommended');
  assert.equal(r.status, 409); assert.equal(r.json.error.code, 'ONBOARDING_REQUIRED');
});
test('온보딩 후 추천 3개, 재호출해도 동일(멱등)', async () => {
  await call('/api/v1/onboarding', 'POST', { goal: 'diet', exerciseExperience: 'none', exercisePlace: 'indoor', avoidMotion: ['jump'], bodyLimit: [] });
  const a = await call('/api/v1/missions/recommended');
  assert.equal(a.status, 200); assert.equal(a.json.data.length, 3);
  assert.ok(a.json.data.every((m) => m.mission_status === 'assigned' && m.environment === 'indoor'));
  const b = await call('/api/v1/missions/recommended');
  assert.deepEqual(b.json.data.map((m) => m.user_mission_id), a.json.data.map((m) => m.user_mission_id));
  missions = a.json.data;
});
test('동시 요청해도 3개만 배정', async () => {
  await call('/api/v1/auth/signup', 'POST', { userId: uid + 'c', password: 'Passw0rd!', email: `${uid}c@t.com`, nickname: '동시' }, null);
  const l = await call('/api/v1/auth/login', 'POST', { userId: uid + 'c', password: 'Passw0rd!' }, null);
  await call('/api/v1/onboarding', 'POST', { goal: 'muscle', exerciseExperience: 'weekly', exercisePlace: 'indoor' }, l.json.accessToken);
  const rs = await Promise.all([1, 2, 3, 4].map(() => call('/api/v1/missions/recommended', 'GET', null, l.json.accessToken)));
  assert.ok(rs.every((r) => r.status === 200 && r.json.data.length === 3));
});
test('잔액 초기 0', async () => {
  assert.equal((await call('/api/v1/points/balance')).json.balance, 0);
});
test('완료 → 포인트 적립(Basic 1.0), 잔액/원장/XP 반영', async () => {
  const m = missions[0];
  const r = await call(`/api/v1/missions/${m.user_mission_id}/complete`, 'POST');
  assert.equal(r.status, 200); assert.equal(r.json.data.earned_point, m.base_point); assert.equal(r.json.data.multiplier, 1);
  assert.equal((await call('/api/v1/points/balance')).json.balance, m.base_point);
  const [[c]] = await pool.query('SELECT total_earned_xp x FROM `Characters` WHERE Users_user_number=?', [userNumber]);
  assert.equal(c.x, m.base_point);
});
test('중복 완료 409, 남의 미션/없는 미션 409, 잘못된 id 400', async () => {
  const id = missions[0].user_mission_id;
  assert.equal((await call(`/api/v1/missions/${id}/complete`, 'POST')).status, 409);
  assert.equal((await call(`/api/v1/missions/99999999/complete`, 'POST')).status, 409);
  assert.equal((await call(`/api/v1/missions/abc/complete`, 'POST')).status, 400);
  assert.equal((await call('/api/v1/points/balance')).json.balance, missions[0].base_point); // 중복 적립 없음
});
test('Premium: 배율 1.5 적용, 만료/비활성은 1.0', async () => {
  await pool.query("INSERT INTO Subscriptions (Users_user_number, plan, sub_status, expires_at) VALUES (?, 'premium', 'active', NULL)", [userNumber]);
  const m = missions[1];
  const r = await call(`/api/v1/missions/${m.user_mission_id}/complete`, 'POST');
  assert.equal(r.json.data.multiplier, 1.5); assert.equal(r.json.data.earned_point, Math.floor(m.base_point * 1.5));
  await pool.query("UPDATE Subscriptions SET expires_at = '2020-01-01 00:00:00' WHERE Users_user_number=?", [userNumber]);
  const r2 = await call(`/api/v1/missions/${missions[2].user_mission_id}/complete`, 'POST');
  assert.equal(r2.json.data.multiplier, 1);
  const [[s]] = await pool.query('SELECT SUM(amount) s FROM Point_transactions WHERE Users_user_number=?', [userNumber]);
  assert.equal((await call('/api/v1/points/balance')).json.balance, Number(s.s));
});
