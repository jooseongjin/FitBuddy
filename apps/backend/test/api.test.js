// 통합 테스트: 실제 DB 필요 (npm run migrate:reset 후 실행)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const pool = require('../src/db');

let server, base;
const uid = 'u' + Date.now().toString().slice(-8);
const body = { userId: uid, password: 'Passw0rd!', email: `${uid}@test.com`, nickname: '테스터' };
const call = (path, method = 'GET', data, token) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

test.before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
test.after(async () => { server.close(); await pool.end(); });

let token;
const ob = { goal: 'diet', exerciseExperience: 'none', exercisePlace: 'indoor', avoidMotion: ['jump', 'floor'], bodyLimit: ['knee'] };

test('signup 성공 + Streaks/Characters 생성', async () => {
  const r = await call('/api/v1/auth/signup', 'POST', body);
  assert.equal(r.status, 201);
  const [[s]] = await pool.query('SELECT (SELECT COUNT(*) FROM Streaks WHERE Users_user_number=?) s, (SELECT COUNT(*) FROM `Characters` WHERE Users_user_number=?) c', [r.json.userNumber, r.json.userNumber]);
  assert.equal(s.s, 1); assert.equal(s.c, 1);
  const [[u]] = await pool.query('SELECT password_hash FROM Users WHERE user_id=?', [uid]);
  assert.notEqual(u.password_hash, body.password); // 평문 저장 금지
});
test('signup 중복 아이디/이메일 409', async () => {
  assert.equal((await call('/api/v1/auth/signup', 'POST', body)).json.error.code, 'USER_ID_TAKEN');
  const r = await call('/api/v1/auth/signup', 'POST', { ...body, userId: uid + 'x' });
  assert.equal(r.status, 409); assert.equal(r.json.error.code, 'EMAIL_TAKEN');
});
test('signup 검증 실패 400', async () => {
  const r = await call('/api/v1/auth/signup', 'POST', { ...body, password: '123', email: 'bad' });
  assert.equal(r.status, 400); assert.equal(r.json.error.code, 'VALIDATION_ERROR');
});
test('login 실패는 동일 응답 401', async () => {
  const a = await call('/api/v1/auth/login', 'POST', { userId: uid, password: 'wrong' });
  const b = await call('/api/v1/auth/login', 'POST', { userId: 'nobody_x', password: 'wrong' });
  assert.equal(a.status, 401); assert.deepEqual(a.json, b.json);
});
test('login 성공 → 토큰, onboardingCompleted=false', async () => {
  const r = await call('/api/v1/auth/login', 'POST', { userId: uid, password: body.password });
  assert.equal(r.status, 200); assert.equal(r.json.onboardingCompleted, false);
  assert.ok(r.json.accessToken); token = r.json.accessToken;
});
test('온보딩: 토큰 없으면 401', async () => {
  assert.equal((await call('/api/v1/onboarding', 'POST', ob)).status, 401);
});
test('온보딩: 저장 201, 중복 409, 조회, 수정', async () => {
  let r = await call('/api/v1/onboarding', 'POST', ob, token);
  assert.equal(r.status, 201); assert.deepEqual(r.json.avoidMotion, ['jump', 'floor']);
  assert.equal((await call('/api/v1/onboarding', 'POST', ob, token)).status, 409);
  r = await call('/api/v1/onboarding', 'GET', null, token);
  assert.equal(r.json.goal, 'diet'); assert.deepEqual(r.json.bodyLimit, ['knee']);
  r = await call('/api/v1/onboarding', 'PUT', { ...ob, exercisePlace: 'outdoor', goal: 'stamina' }, token);
  assert.equal(r.status, 200); assert.deepEqual(r.json.avoidMotion, []); // 실외면 비움
});
test('온보딩: 잘못된 enum 400', async () => {
  assert.equal((await call('/api/v1/onboarding', 'PUT', { ...ob, goal: 'abc' }, token)).status, 400);
});
test('로그인 재시도 → onboardingCompleted=true, 추천 프로시저 연동', async () => {
  const r = await call('/api/v1/auth/login', 'POST', { userId: uid, password: body.password });
  assert.equal(r.json.onboardingCompleted, true);
  await pool.query('CALL sp_assign_daily_missions(?, CURDATE())', [r.json.user.userNumber]);
  const [[c]] = await pool.query('SELECT COUNT(*) c FROM User_missions WHERE Users_user_number=?', [r.json.user.userNumber]);
  assert.equal(c.c, 3);
});
