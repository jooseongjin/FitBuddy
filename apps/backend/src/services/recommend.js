// 오늘의 맞춤 미션 (추천 엔진 연동용 서비스 함수)
// - 미션 API(라우트/컨트롤러)는 이 함수만 호출하면 된다. 추천 규칙은 DB 프로시저 sp_assign_daily_missions(006_recommend_v2.sql)에 있음
// - 같은 날 여러 번 호출해도 처음 배정된 3개를 그대로 돌려준다 (하루 1회 배정)
//
// 사용 예 (컨트롤러)
//   const { getTodayMissions } = require('../services/recommend');
//   router.get('/today', auth, async (req, res, next) => {
//     try { res.json({ success: true, missions: await getTodayMissions(req.user.user_number) }); }
//     catch (e) { next(e); }
//   });
const pool = require('../db');
const { ApiError } = require('../errors');

/** KST 기준 오늘 날짜 'YYYY-MM-DD' */
const todayKST = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * 사용자의 오늘(또는 지정한 날짜) 미션 목록. 없으면 추천 엔진으로 배정한 뒤 반환
 * @param {number} userNumber Users.user_number (인증 미들웨어의 req.user.user_number)
 * @param {string} [date] 'YYYY-MM-DD' (생략 시 KST 오늘)
 * @returns {Promise<Array<{user_mission_id:number, mission_id:number, title:string, description:string|null,
 *   exercise_type:string, environment:string, target_value:number, target_unit:string, difficulty:string,
 *   base_point:number, mission_status:'assigned'|'completed', completed_at:Date|null}>>}
 * @throws {ApiError} 409 ONBOARDING_REQUIRED — 온보딩을 하지 않아 추천할 수 없음
 */
async function getTodayMissions(userNumber, date = todayKST()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'VALIDATION_ERROR', '날짜 형식이 올바르지 않습니다.');

  const [profile] = await pool.query(
    'SELECT 1 FROM Onboarding_profiles WHERE Users_user_number = ?', [userNumber]);
  if (!profile.length) throw new ApiError(409, 'ONBOARDING_REQUIRED', '온보딩을 먼저 완료해주세요.');

  await pool.query('CALL sp_assign_daily_missions(?, ?)', [userNumber, date]);

  const [rows] = await pool.query(
    `SELECT um.user_mission_id, m.Missions_id AS mission_id, m.title, m.description, m.exercise_type,
            m.environment, m.target_value, m.target_unit, m.difficulty, m.base_point,
            um.mission_status, um.completed_at
       FROM User_missions um
       JOIN Missions m ON m.Missions_id = um.Missions_id
      WHERE um.Users_user_number = ? AND um.assigned_date = ?
      ORDER BY um.user_mission_id`,
    [userNumber, date]);
  return rows;
}

module.exports = { getTodayMissions, todayKST };
