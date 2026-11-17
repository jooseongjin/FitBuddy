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
test('CORS: iOS Capacitor 출처에서 건강 API 호출 허용', async () => {
  const r = await call('/api/v1/health/today', 'OPTIONS', null, null, {
    Origin: 'capacitor://localhost',
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'content-type,authorization',
  });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'capacitor://localhost');
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
test('추천 API: 오늘 미션 3개 응답 및 DB 배정 확인', async () => {
  const r = await call('/api/v1/missions/recommended', 'GET', null, token);
  assert.equal(r.status, 200);
  assert.equal(r.json.success, true);
  assert.equal(r.json.data.length, 3);

  const [[counts]] = await pool.query(
    `SELECT COUNT(*) AS mission_count, COUNT(DISTINCT Missions_id) AS unique_count
       FROM User_missions
      WHERE Users_user_number = (SELECT user_number FROM Users WHERE user_id = ?)
        AND assigned_date = DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR)`,
    [uid],
  );
  assert.equal(counts.mission_count, 3);
  assert.equal(counts.unique_count, 3);
});
test('신규 계정 진행 API: 캐릭터·Streak·포인트가 DB 초기값을 반환', async () => {
  const [character, streak, balance, history] = await Promise.all([
    call('/api/v1/character', 'GET', null, token),
    call('/api/v1/streak', 'GET', null, token),
    call('/api/v1/points/balance', 'GET', null, token),
    call('/api/v1/points/history', 'GET', null, token),
  ]);
  assert.equal(character.status, 200);
  assert.equal(character.json.data.level, 1);
  assert.equal(character.json.data.total_earned_xp, 0);
  assert.equal(streak.status, 200);
  assert.equal(streak.json.data.current_streak, 0);
  assert.equal(balance.json.data.balance, 0);
  assert.deepEqual(history.json.data.items, []);
});
test('건강 동기화: 오늘 지표를 저장하고 미션 진행도에 반영하며 목표 전 보상 차단', async () => {
  const before = await call('/api/v1/health/today', 'GET', null, token);
  assert.equal(before.status, 200);
  assert.equal(before.json.data.steps, 0);

  const missions = await call('/api/v1/missions/recommended', 'GET', null, token);
  const firstMission = missions.json.data[0];
  const blocked = await call(`/api/v1/missions/${firstMission.user_mission_id}/complete`, 'POST', {}, token);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.json.code, 'MISSION_NOT_ACHIEVED');

  const sync = await call('/api/v1/health/today', 'PUT', {
    steps: 100000,
    active_calories: 1000,
    exercise_minutes: 1000,
    source: 'healthkit',
  }, token);
  assert.equal(sync.status, 200);
  assert.equal(sync.json.data.steps, 100000);

  const refreshed = await call('/api/v1/missions/recommended', 'GET', null, token);
  assert.ok(refreshed.json.data.every((mission) => mission.current_value >= mission.target_value || mission.target_unit === '회'));
});
test('반복 미션 진행 기록: 본인 오늘 미션만 횟수를 올리고 목표 전 완료를 거부', async () => {
  const missions = await call('/api/v1/missions/recommended', 'GET', null, token);
  const repeated = missions.json.data.find((mission) => mission.target_unit === '회');
  assert.ok(repeated, '테스트 사용자의 오늘 추천에 반복 미션이 있어야 함');
  const progress = await call(`/api/v1/missions/${repeated.user_mission_id}/progress`, 'POST', { increment: 1 }, token);
  assert.equal(progress.status, 200);
  assert.equal(progress.json.data.current_value, 1);
  if (repeated.target_value > 1) {
    const complete = await call(`/api/v1/missions/${repeated.user_mission_id}/complete`, 'POST', {}, token);
    assert.equal(complete.status, 409);
    assert.equal(complete.json.code, 'MISSION_NOT_ACHIEVED');
  }
});
test('미션 완료: DB 원장·XP·Streak 갱신 및 중복 완료 방지', async () => {
  const recommended = await call('/api/v1/missions/recommended', 'GET', null, token);
  const missionId = recommended.json.data[0].user_mission_id;
  const completed = await call(`/api/v1/missions/${missionId}/complete`, 'POST', {}, token);
  assert.equal(completed.status, 200);
  assert.ok(completed.json.data.earned_point > 0);
  assert.equal(completed.json.data.balance, completed.json.data.earned_point);
  assert.equal(completed.json.data.streak.current, 1);
  assert.equal((await call(`/api/v1/missions/${missionId}/complete`, 'POST', {}, token)).status, 409);

  const [character, streak, balance, history] = await Promise.all([
    call('/api/v1/character', 'GET', null, token),
    call('/api/v1/streak', 'GET', null, token),
    call('/api/v1/points/balance', 'GET', null, token),
    call('/api/v1/points/history', 'GET', null, token),
  ]);
  assert.equal(character.json.data.total_earned_xp, completed.json.data.earned_xp);
  assert.equal(streak.json.data.current_streak, 1);
  assert.equal(balance.json.data.balance, completed.json.data.earned_point);
  assert.equal(history.json.data.items.length, 1);
});
test('Streak 복구: 어제 기록을 복구하고 포인트 원장에서 비용 차감', async () => {
  await pool.query(
    `UPDATE Streaks
        SET current_streak = 3,
            last_completed_date = DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR) - INTERVAL 2 DAY
      WHERE Users_user_number = (SELECT user_number FROM Users WHERE user_id = ?)`,
    [uid],
  );
  await pool.query(
    `INSERT INTO Point_transactions (Users_user_number, source, amount)
     SELECT user_number, 'mission_complete', 400 FROM Users WHERE user_id = ?`,
    [uid],
  );
  const [[before]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM Point_transactions
      WHERE Users_user_number = (SELECT user_number FROM Users WHERE user_id = ?)`,
    [uid],
  );
  const [[date]] = await pool.query('SELECT DATE_FORMAT(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR) - INTERVAL 1 DAY, \'%Y-%m-%d\') AS missed_date');

  const repaired = await call('/api/v1/streak/repair', 'POST', { missed_date: date.missed_date, method: 'points' }, token);
  assert.equal(repaired.status, 200);
  const [streak, balance] = await Promise.all([
    call('/api/v1/streak', 'GET', null, token),
    call('/api/v1/points/balance', 'GET', null, token),
  ]);
  assert.equal(streak.json.data.current_streak, 3);
  assert.equal(streak.json.data.last_completed_date, date.missed_date);
  assert.equal(balance.json.data.balance, Number(before.balance) - 300);
  assert.equal((await call('/api/v1/streak/repair', 'POST', { missed_date: date.missed_date, method: 'points' }, token)).status, 409);
});
test('없는 경로 404', async () => {
  const r = await call('/api/v1/nothing');
  assert.equal(r.status, 404); assert.equal(r.json.code, 'NOT_FOUND');
});
