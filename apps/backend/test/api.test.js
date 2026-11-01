// 통합 테스트: 회원가입 / 로그인 / 온보딩 / CORS (npm run migrate:reset 후 실행)
// 요청·응답 형식은 프론트(Login.tsx, Signup.tsx)와 TRD(API-01~03) 기준
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const pool = require('../src/db');

let server, base;
const uid = 'u' + Date.now().toString().slice(-8);
// 프론트 Signup.tsx 가 보내는 모양 그대로
const body = { user_id: uid, email: `${uid}@test.com`, password: 'Passw0rd!', nickname: '테스터' };
const call = (path, method = 'GET', data, token, extra = {}) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra },
    body: data ? JSON.stringify(data) : undefined,
  }).then(async (r) => ({ status: r.status, headers: r.headers, json: r.status === 204 ? null : await r.json() }));

test.before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
test.after(async () => { server.close(); await pool.end(); });

let token;
const ob = { goal: 'diet', exercise_experience: 'none', exercise_place: 'indoor', avoid_motion: ['jump', 'floor'], body_limit: ['knee'] };

test('CORS: 프론트(localhost:5173) preflight 허용', async () => {
  const r = await call('/api/v1/auth/login', 'OPTIONS', null, null, {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(r.headers.get('access-control-allow-headers'), /Authorization/);
});
test('signup 성공(201) + Streaks/Characters 생성, 비밀번호 해시 저장', async () => {
  const r = await call('/api/v1/auth/signup', 'POST', body);
  assert.equal(r.status, 201); assert.equal(r.json.success, true);
  const n = r.json.data.user_number;
  const [[s]] = await pool.query('SELECT (SELECT COUNT(*) FROM Streaks WHERE Users_user_number=?) s, (SELECT COUNT(*) FROM `Characters` WHERE Users_user_number=?) c', [n, n]);
  assert.equal(s.s, 1); assert.equal(s.c, 1);
  const [[u]] = await pool.query('SELECT password_hash FROM Users WHERE user_id=?', [uid]);
  assert.notEqual(u.password_hash, body.password);
});
test('signup: 프론트 검증을 통과하는 짧은 아이디/닉네임도 가입 가능', async () => {
  const short = 'a' + Date.now().toString().slice(-5);
  const r = await call('/api/v1/auth/signup', 'POST', { user_id: short, email: `${short}@t.com`, password: 'abcdefgh', nickname: '나' });
  assert.equal(r.status, 201);
});
test('signup 중복 아이디/이메일 409', async () => {
  const a = await call('/api/v1/auth/signup', 'POST', body);
  assert.equal(a.status, 409); assert.equal(a.json.code, 'USER_ID_TAKEN');
  const b = await call('/api/v1/auth/signup', 'POST', { ...body, user_id: uid + 'x' });
  assert.equal(b.status, 409); assert.equal(b.json.code, 'EMAIL_TAKEN');
});
test('signup 검증 실패 400 (비밀번호 8자 미만, 이메일 형식)', async () => {
  const r = await call('/api/v1/auth/signup', 'POST', { ...body, password: '123', email: 'bad' });
  assert.equal(r.status, 400); assert.equal(r.json.success, false); assert.equal(r.json.code, 'VALIDATION_ERROR');
});
test('login 실패는 아이디 없음/비밀번호 틀림 모두 같은 401', async () => {
  const a = await call('/api/v1/auth/login', 'POST', { user_id: uid, password: 'wrong' });
  const b = await call('/api/v1/auth/login', 'POST', { user_id: 'nobody_x', password: 'wrong' });
  assert.equal(a.status, 401); assert.deepEqual(a.json, b.json);
});
test('login 성공 → res.data.token (Login.tsx 형식), onboarding_completed=false', async () => {
  const r = await call('/api/v1/auth/login', 'POST', { user_id: uid, password: body.password });
  assert.equal(r.status, 200); assert.ok(r.json.token);
  assert.equal(r.json.onboarding_completed, false); assert.equal(r.json.user.user_id, uid);
  token = r.json.token;
});
test('login: 이메일로도 로그인 가능 (화면 문구 "아이디 또는 이메일")', async () => {
  const r = await call('/api/v1/auth/login', 'POST', { user_id: body.email.toUpperCase(), password: body.password });
  assert.equal(r.status, 200); assert.ok(r.json.token);
});
test('탈퇴 계정 로그인 403', async () => {
  const w = 'w' + Date.now().toString().slice(-8);
  await call('/api/v1/auth/signup', 'POST', { user_id: w, email: `${w}@t.com`, password: 'Passw0rd!', nickname: '탈퇴' });
  await pool.query("UPDATE Users SET user_status='withdrawn' WHERE user_id=?", [w]);
  assert.equal((await call('/api/v1/auth/login', 'POST', { user_id: w, password: 'Passw0rd!' })).status, 403);
});
test('공용 테스트 계정(testuser01) 로그인, 온보딩 완료 상태', async () => {
  const r = await call('/api/v1/auth/login', 'POST', { user_id: 'testuser01', password: 'Test1234!' });
  assert.equal(r.status, 200); assert.equal(r.json.onboarding_completed, true);
});
test('온보딩: 토큰 없으면 401', async () => {
  assert.equal((await call('/api/v1/onboarding', 'POST', ob)).status, 401);
});
test('온보딩: 저장 201, 중복 409, 조회, 수정 (snake_case)', async () => {
  let r = await call('/api/v1/onboarding', 'POST', ob, token);
  assert.equal(r.status, 201); assert.deepEqual(r.json.data.avoid_motion, ['jump', 'floor']);
  assert.equal((await call('/api/v1/onboarding', 'POST', ob, token)).status, 409);
  r = await call('/api/v1/onboarding', 'GET', null, token);
  assert.equal(r.json.data.goal, 'diet'); assert.deepEqual(r.json.data.body_limit, ['knee']);
  r = await call('/api/v1/onboarding', 'PUT', { ...ob, exercise_place: 'outdoor', goal: 'stamina' }, token);
  assert.equal(r.status, 200); assert.deepEqual(r.json.data.avoid_motion, []); // 실외면 비움
});
test('온보딩: 잘못된 값 400', async () => {
  assert.equal((await call('/api/v1/onboarding', 'PUT', { ...ob, goal: 'abc' }, token)).status, 400);
});
test('없는 경로 404', async () => {
  const r = await call('/api/v1/nothing');
  assert.equal(r.status, 404); assert.equal(r.json.code, 'NOT_FOUND');
});
