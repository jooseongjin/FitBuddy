// 추천 엔진 v2 테스트 (sp_assign_daily_missions + services/recommend.js)
// npm run migrate:reset 후 실행. 테스트용 사용자를 새로 만들어 2030년 날짜로 배정하므로 다른 데이터에 영향 없음
const test = require('node:test');
const assert = require('node:assert');
const pool = require('../src/db');
const { getTodayMissions } = require('../src/services/recommend');

test.after(() => pool.end());

const prefix = 'r' + Date.now().toString().slice(-7);
let seq = 0;
/** 테스트 사용자 생성 (+ 온보딩). profile 이 없으면 온보딩 안 한 사용자 */
async function makeUser(profile) {
  const id = `${prefix}_${++seq}`;
  const [r] = await pool.query(
    'INSERT INTO Users (user_id, password_hash, email, nickname) VALUES (?, ?, ?, ?)',
    [id, 'x', `${id}@test.com`, '추천테스트']);
  if (profile) {
    await pool.query(
      `INSERT INTO Onboarding_profiles (Users_user_number, goal, exercise_experience, exercise_place, avoid_motion, body_limit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [r.insertId, profile.goal, profile.exercise_experience, profile.exercise_place,
        (profile.avoid_motion || []).join(','), (profile.body_limit || []).join(',')]);
  }
  return r.insertId;
}
const day = (i) => new Date(Date.UTC(2030, 0, 1 + i)).toISOString().slice(0, 10); // 2030-01-01 + i
/** n일 연속 배정 → 날짜별 미션 목록 */
async function runDays(user, n, start = 0) {
  const days = [];
  for (let i = start; i < start + n; i++) days.push(await getTodayMissions(user, day(i)));
  return days;
}
/** 미션에 붙은 태그 이름 */
async function tagsOf(missionIds) {
  const [rows] = await pool.query(
    `SELECT mt.Missions_id, t.tag_name FROM Mission_tags mt JOIN Tags t ON t.tag_id = mt.Tags_tag_id
      WHERE mt.Missions_id IN (?)`, [missionIds]);
  return rows;
}

test('R-01 온보딩을 안 한 사용자는 409 ONBOARDING_REQUIRED', async () => {
  const user = await makeUser(null);
  await assert.rejects(getTodayMissions(user, day(0)), (e) => e.status === 409 && e.code === 'ONBOARDING_REQUIRED');
});

test('R-02 같은 날 다시 호출하면 처음 배정된 3개를 그대로 반환 (하루 1회 배정)', async () => {
  const user = await makeUser({ goal: 'diet', exercise_experience: 'none', exercise_place: 'indoor' });
  const a = await getTodayMissions(user, day(0));
  const b = await getTodayMissions(user, day(0));
  assert.equal(a.length, 3);
  assert.deepEqual(b.map((m) => m.mission_id), a.map((m) => m.mission_id));
  assert.ok(a.every((m) => m.mission_status === 'assigned'));
});

test('R-03 야외 입문자도 14일 연속 매일 3개 배정 (v1은 5일째부터 0개)', async () => {
  const user = await makeUser({ goal: 'stamina', exercise_experience: 'none', exercise_place: 'outdoor' });
  const days = await runDays(user, 14);
  days.forEach((d, i) => {
    assert.equal(d.length, 3, `${i + 1}일째 ${d.length}개`);
    assert.equal(new Set(d.map((m) => m.mission_id)).size, 3, `${i + 1}일째 같은 날 중복`);
    assert.ok(d.every((m) => m.environment === 'outdoor'));
  });
});

test('R-04 새 미션이 남아 있는 동안은 최근 7일 미션을 반복하지 않음 (야외 입문자 5일 = 15개)', async () => {
  const user = await makeUser({ goal: 'diet', exercise_experience: 'monthly', exercise_place: 'outdoor' });
  const ids = (await runDays(user, 5)).flat().map((m) => m.mission_id);
  assert.equal(new Set(ids).size, 15);
});

test('R-05 운동 종류 분산: 하루 3개가 근력·유산소·스트레칭으로 서로 다름', async () => {
  for (const place of ['indoor', 'outdoor']) {
    const user = await makeUser({ goal: 'muscle', exercise_experience: 'weekly', exercise_place: place });
    const days = await runDays(user, 3);
    days.forEach((d, i) => assert.equal(new Set(d.map((m) => m.exercise_type)).size, 3, `${place} ${i + 1}일째 종류 중복`));
  }
});

test('R-06 입문자에게 고급, 고급자에게 입문 미션은 배정하지 않음 (난이도 ±1단계)', async () => {
  const beginner = await makeUser({ goal: 'diet', exercise_experience: 'none', exercise_place: 'indoor' });
  const expert = await makeUser({ goal: 'diet', exercise_experience: 'daily', exercise_place: 'indoor' });
  // 완료 기록 없이 7일이 지나면 완료율 0% → 한 단계 하향되므로, 조정 전 이틀만 확인
  for (const d of await runDays(beginner, 2)) assert.ok(d.every((m) => m.difficulty !== 'advanced'));
  for (const d of await runDays(expert, 2)) assert.ok(d.every((m) => m.difficulty !== 'beginner'));
});

test('R-07 피할 동작·불편 부위를 모두 고른 실내 사용자: 해당 태그 미션 제외, 그래도 7일 매일 3개', async () => {
  const user = await makeUser({
    goal: 'diet', exercise_experience: 'none', exercise_place: 'indoor',
    avoid_motion: ['jump', 'prone', 'knee_bend', 'floor'], body_limit: ['knee', 'back', 'shoulder', 'wrist', 'ankle'] });
  const days = await runDays(user, 7);
  days.forEach((d, i) => assert.equal(d.length, 3, `${i + 1}일째 ${d.length}개`));
  const ids = [...new Set(days.flat().map((m) => m.mission_id))];
  const forbidden = ['jump', 'prone', 'knee_bend', 'floor', 'knee', 'back', 'shoulder', 'wrist', 'ankle'];
  const bad = (await tagsOf(ids)).filter((t) => forbidden.includes(t.tag_name));
  assert.deepEqual(bad, []);
});

test('R-08 완료율 반영: 최근 미션을 모두 완료하면 난이도 상향, 거의 안 하면 하향', async () => {
  // 주 1회 운동(기준 중급) 사용자 두 명이 3일 동안 9개를 배정받음
  const good = await makeUser({ goal: 'stamina', exercise_experience: 'weekly', exercise_place: 'indoor' });
  const lazy = await makeUser({ goal: 'stamina', exercise_experience: 'weekly', exercise_place: 'indoor' });
  await runDays(good, 3);
  await runDays(lazy, 3);
  await pool.query(`UPDATE User_missions SET mission_status = 'completed', completed_at = NOW()
                     WHERE Users_user_number = ?`, [good]);              // 9/9 = 100% → 고급 기준
  await pool.query(`UPDATE User_missions SET mission_status = 'completed', completed_at = NOW()
                     WHERE Users_user_number = ? ORDER BY user_mission_id LIMIT 2`, [lazy]); // 2/9 = 22% → 입문 기준
  const [goodDay4] = await runDays(good, 1, 3);
  const [lazyDay4] = await runDays(lazy, 1, 3);
  assert.equal(goodDay4.length, 3);
  assert.equal(lazyDay4.length, 3);
  // 기준이 중급이면 입문~고급 모두 가능하지만, 조정 후에는 범위가 한쪽으로 좁아짐
  assert.ok(goodDay4.every((m) => m.difficulty !== 'beginner'), '상향 후 입문 미션이 배정됨');
  assert.ok(lazyDay4.every((m) => m.difficulty !== 'advanced'), '하향 후 고급 미션이 배정됨');
});
