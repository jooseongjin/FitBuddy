// controllers/missionController.js
const completeMission = async (req, res) => {
  const userNumber = req.user.user_number;
  const userMissionId = req.params.id; // user_mission_id

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
      return res.status(409).json({ message: '이미 완료되었거나 배정되지 않은 미션입니다.' });
    }

    // 3. 미션 기본 포인트 및 사용자 구독 플랜 조회 (SEC-03)
    const [[missionInfo]] = await connection.query(
      `SELECT m.base_point, m.Missions_id
       FROM User_missions um
       JOIN Missions m ON um.Missions_id = m.Missions_id
       WHERE um.user_mission_id = ?`,
      [userMissionId]
    );

    const [[subscription]] = await connection.query(
      `SELECT plan, sub_status, expires_at FROM Subscriptions WHERE Users_user_number = ?`,
      [userNumber]
    );

    // 구독 플랜에 따른 배율 결정
    const isPremium = subscription && subscription.plan === 'premium' && new Date(subscription.expires_at) > new Date();
    const multiplier = isPremium ? 1.5 : 1.0;
    const basePoint = missionInfo.base_point;
    const earnedAmount = Math.floor(basePoint * multiplier);

    // 4. Point_transactions 원장에 적립 기록 INSERT (NFR-05)
    await connection.query(
      `INSERT INTO Point_transactions (Users_user_number, source, ref_id, base_point, multiplier, amount, created_at)
       VALUES (?, 'mission_complete', ?, ?, ?, ?, NOW())`,
      [userNumber, userMissionId, basePoint, multiplier, earnedAmount]
    );

    // 5. 캐릭터 total_earned_xp (누적 경험치) 증가 (ADR-04)
    await connection.query(
      `UPDATE Characters 
       SET total_earned_xp = total_earned_xp + ?
       WHERE Users_user_number = ?`,
      [earnedAmount, userNumber]
    );

    // 6. 트랜잭션 커밋
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: '미션 완료 처리되었습니다.',
      data: {
        earned_point: earnedAmount,
        multiplier: multiplier
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Complete Mission Error:', error);
    return res.status(500).json({ message: '미션 완료 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
};