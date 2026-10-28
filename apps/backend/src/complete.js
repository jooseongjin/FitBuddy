const db = require('../db');

// API-05: 미션 완료 처리 및 포인트/경험치 적립
const completeMission = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user?.id || req.body.userId;
    const { missionId } = req.params;

    // 1. 미션 배정 상태 확인 및 중복 방어 (NFR-02)
    const [missionCheck] = await connection.query(
      `SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ? FOR UPDATE`,
      [userId, missionId]
    );

    if (missionCheck.length === 0 || missionCheck[0].status !== 'assigned') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '완료할 수 없는 미션이거나 이미 처리된 미션입니다.',
      });
    }

    const mission = missionCheck[0];

    // 2. 미션 상태를 'completed'로 업데이트
    await connection.query(
      `UPDATE user_missions SET status = 'completed', completed_at = NOW() WHERE user_id = ? AND mission_id = ?`,
      [userId, missionId]
    );

    // 3. 포인트 원장(point_transactions)에 내역 추가
    await connection.query(
      `INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'earn', '미션 완료 보상')`,
      [userId, mission.reward_points]
    );

    // 4. 유저 경험치(exp) 업데이트
    await connection.query(
      `UPDATE users SET exp = exp + ? WHERE user_id = ?`,
      [mission.reward_exp, userId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: '미션이 성공적으로 완료되었습니다.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('미션 완료 처리 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  completeMission,
};
