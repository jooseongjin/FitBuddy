// 건강 데이터 연동·미션 인증 테이블 테스트 (db/007_health_activity.sql)
// npm run migrate:reset 후 실행. 테스트용 사용자를 새로 만들어 쓰므로 다른 데이터에 영향 없음
const test = require('node:test');
const assert = require('node:assert');
const pool = require('../src/db');

test.after(() => pool.end());

const prefix = 'h' + Date.now().toString().slice(-7);
let seq = 0;
async function makeUser() {
  const id = `${prefix}_${++seq}`;
  const [r] = await pool.query(
    'INSERT INTO Users (user_id, password_hash, email, nickname) VALUES (?, ?, ?, ?)',
    [id, 'x', `${id}@test.com`, '건강테스트']);
  return r.insertId;
}
const record = (user, externalId, over = {}) => ({
  Users_user_number: user, platform: 'health_connect', external_id: externalId, record_type: 'steps',
  value: 3000, unit: 'count', start_at: '2030-02-01 08:00:00', end_at: '2030-02-01 09:00:00',
  source_app: 'com.sec.android.app.shealth', device_type: 'watch', recording_method: 'automatic', ...over });
const insertRecord = (r) => pool.query('INSERT INTO Activity_records SET ?', [r]);

test('H-01 새 테이블 5개가 생성됨', async () => {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('Health_connections','Activity_records','Daily_activity','Mission_verify_rules','Mission_verifications')`);
  assert.equal(rows.length, 5);
});

test('H-02 직접 입력·출처 불명 기록은 신뢰 기록이 아님 (is_trusted 는 DB가 계산)', async () => {
  const user = await makeUser();
  const cases = { automatic: 1, active: 1, manual: 0, unknown: 0 };
  for (const method of Object.keys(cases)) await insertRecord(record(user, `${prefix}-m-${method}`, { recording_method: method }));
  const [rows] = await pool.query(
    'SELECT recording_method, is_trusted FROM Activity_records WHERE Users_user_number = ?', [user]);
  assert.equal(rows.length, 4);
  for (const r of rows) assert.equal(r.is_trusted, cases[r.recording_method], r.recording_method);
  // 앱이 is_trusted 값을 직접 지정해 보내도 저장할 수 없음
  await assert.rejects(insertRecord({ ...record(user, `${prefix}-m-forged`, { recording_method: 'manual' }), is_trusted: 1 }));
});

test('H-03 같은 기록(external_id)은 다시 올릴 수 없고, 다른 계정으로도 올릴 수 없음', async () => {
  const a = await makeUser();
  const b = await makeUser();
  await insertRecord(record(a, `${prefix}-dup`));
  await assert.rejects(insertRecord(record(a, `${prefix}-dup`)), (e) => e.code === 'ER_DUP_ENTRY');
  await assert.rejects(insertRecord(record(b, `${prefix}-dup`)), (e) => e.code === 'ER_DUP_ENTRY');
});

test('H-04 하루 합계는 사용자·날짜당 1행 (동기화 때 갱신)', async () => {
  const user = await makeUser();
  const upsert = (steps, verified) => pool.query(
    `INSERT INTO Daily_activity (Users_user_number, activity_date, steps, verified_steps) VALUES (?, '2030-02-01', ?, ?)
     ON DUPLICATE KEY UPDATE steps = VALUES(steps), verified_steps = VALUES(verified_steps)`, [user, steps, verified]);
  await upsert(3000, 3000);
  await upsert(6842, 6000);
  const [rows] = await pool.query('SELECT steps, verified_steps FROM Daily_activity WHERE Users_user_number = ?', [user]);
  assert.deepEqual(rows.map((r) => ({ ...r })), [{ steps: 6842, verified_steps: 6000 }]);
});

test('H-05 인증 기준: 시간(분) 미션은 모두 기준이 있고, 횟수(회) 미션은 기준이 없음. 걷기 미션은 걸음 수', async () => {
  const [[byUnit]] = await pool.query(
    `SELECT SUM(m.target_unit = '분') AS minute_missions,
            SUM(m.target_unit = '분' AND r.Missions_id IS NOT NULL) AS minute_with_rule,
            SUM(m.target_unit = '회' AND r.Missions_id IS NOT NULL) AS count_with_rule
       FROM Missions m LEFT JOIN Mission_verify_rules r ON r.Missions_id = m.Missions_id`);
  assert.ok(Number(byUnit.minute_missions) > 0);
  assert.equal(Number(byUnit.minute_with_rule), Number(byUnit.minute_missions));
  assert.equal(Number(byUnit.count_with_rule), 0);
  const [[walk]] = await pool.query(
    `SELECT r.metric, r.min_value FROM Mission_verify_rules r JOIN Missions m ON m.Missions_id = r.Missions_id
      WHERE m.title = '빠르게 걷기'`);
  assert.deepEqual({ ...walk }, { metric: 'steps', min_value: 3000 });   // 30분 × 100걸음
});

test('H-06 미션 1건당 인증 1건, 운동 기록 1건은 미션 1건에만 사용', async () => {
  const user = await makeUser();
  const [missions] = await pool.query('SELECT Missions_id FROM Missions ORDER BY Missions_id LIMIT 2');
  const ums = [];
  for (const m of missions) {
    const [r] = await pool.query(
      `INSERT INTO User_missions (Missions_id, Users_user_number, assigned_date) VALUES (?, ?, '2030-02-01')`, [m.Missions_id, user]);
    ums.push(r.insertId);
  }
  const [rec] = await insertRecord(record(user, `${prefix}-ex`, { record_type: 'exercise', exercise_type: 'yoga', value: 20, unit: 'min', recording_method: 'active' }));
  const verify = (userMission, recordId) => pool.query(
    `INSERT INTO Mission_verifications (User_missions_user_mission_id, verify_status, metric, measured_value, required_value, Activity_records_record_id)
     VALUES (?, 'verified', 'exercise_minutes', 20, 10, ?)`, [userMission, recordId]);
  await verify(ums[0], rec.insertId);
  await assert.rejects(verify(ums[0], null), (e) => e.code === 'ER_DUP_ENTRY');          // 같은 미션 재인증
  await assert.rejects(verify(ums[1], rec.insertId), (e) => e.code === 'ER_DUP_ENTRY');  // 같은 운동 기록 재사용
  const [[row]] = await pool.query(
    'SELECT reward_multiplier FROM Mission_verifications WHERE User_missions_user_mission_id = ?', [ums[0]]);
  assert.equal(Number(row.reward_multiplier), 1);
});
