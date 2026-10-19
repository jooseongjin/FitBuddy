// controllers/missionController.js
// - getRecommendedMissions : GET  /api/v1/missions/recommended
// - completeMission        : POST /api/v1/missions/:id/complete
const db = require('../db');
const { ApiError } = require('../errors');

// KST 기준 오늘 날짜 (YYYY-MM-DD)
const todayKST = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

const SELECT_TODAY = `
  SELECT um.user_mission_id, m.Missions_id, m.title, m.description, m.exercise_type, m.environment,
         m.target_value, m.target_unit, m.difficulty, m.base_point, um.mission_status
  FROM User_missions um
  JOIN Missions m ON um.Missions_id = m.Missions_id
  WHERE um.Users_user_number = ? AND um.assigned_date = ?
  ORDER BY um.user_mission_id`;

const getRecommendedMissions = async (req, res, next) => {
  try {
    const userNumber = req.user.userNumber;
    const today = todayKST();

    // 1. 오늘 배정된 미션 조회
    let [rows] = await db.query(SELECT_TODAY, [userNumber, today]);

    // 2. 없으면 룰 기반 추천 프로시저로 배정 (온보딩 설문 필요)
    if (rows.length === 0) {
      const [[p]] = await db.query('SELECT COUNT(*) AS c FROM Onboarding_profiles WHERE Users_user_number = ?', [userNumber]);
      if (!p.c) throw new ApiError(409, 'ONBOARDING_REQUIRED', '온보딩 설문을 먼저 완료해야 합니다.');
      try {
        await db.query('CALL sp_assign_daily_missions(?, ?)', [userNumber, today]);
      } catch (e) {
        // 동시 요청으로 이미 배정된 경우(UNIQUE 충돌)는 정상 → 재조회
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
      [rows] = await db.query(SELECT_TODAY, [userNumber, today]);
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const completeMission = async (req, res, next) => {
  const userNumber = req.user.userNumber;
  const userMissionId = Number(req.params.id); // user_mission_id
  if (!Number.isInteger(userMissionId) || userMissionId <= 0) {
    return next(new ApiError(400, 'INVALID_ID', '미션 ID가 올바르지 않습니다.'));
  }

  const connection = await db.getConnection();
  try {
    // 1. 트랜잭션 시작 (NFR-01)
    await connection.beginTransaction();

    // 2. 조건부 UPDATE로 중복 미션 완료 방지 (NFR-02)
    const [updateResult] = await connection.query(
      `UPDATE User_missions
       SET mission_status = 'completed', completed_at = NOW()
       WHERE user_mission_id = ? AND Users_user_number = ? AND mission_status = 'assigned'`,
      [userMissionId, userNumber]
    );
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      throw new ApiError(409, 'MISSION_NOT_COMPLETABLE', '이미 완료되었거나 배정되지 않은 미션입니다.');
    }

    // 3. 미션 기본 포인트 및 구독 플랜 조회 (SEC-03: 배율은 서버가 결정)
    const [[missionInfo]] = await connection.query(
      `SELECT m.base_point FROM User_missions um JOIN Missions m ON um.Missions_id = m.Missions_id
       WHERE um.user_mission_id = ?`, [userMissionId]);
    const [[subscription]] = await connection.query(
      `SELECT plan, sub_status, expires_at FROM Subscriptions WHERE Users_user_number = ?`, [userNumber]);

    // Premium: 활성 상태이고, 만료일이 없거나 아직 지나지 않은 경우 (배율 1.5, 상세 기준 미정)
    const isPremium = !!subscription && subscription.plan === 'premium' && subscription.sub_status === 'active'
      && (!subscription.expires_at || new Date(subscription.expires_at) > new Date());
    const multiplier = isPremium ? 1.5 : 1.0;
    const basePoint = missionInfo.base_point;
    const earnedAmount = Math.floor(basePoint * multiplier);

    // 4. Point_transactions 원장에 적립 기록 (NFR-05)
    await connection.query(
      `INSERT INTO Point_transactions (Users_user_number, source, ref_id, base_point, multiplier, amount, created_at)
       VALUES (?, 'mission_complete', ?, ?, ?, ?, NOW())`,
      [userNumber, userMissionId, basePoint, multiplier, earnedAmount]);

    // 5. 캐릭터 누적 경험치 증가 (ADR-04, 감소 없음)
    await connection.query(
      `UPDATE \`Characters\` SET total_earned_xp = total_earned_xp + ? WHERE Users_user_number = ?`,
      [earnedAmount, userNumber]);

    // 6. 커밋
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: '미션 완료 처리되었습니다.',
      data: { earned_point: earnedAmount, multiplier },
    });
  } catch (error) {
    await connection.rollback().catch(() => {});
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = { getRecommendedMissions, completeMission };
