const db = require('./db');

const MAX_LEVEL = 20;

function calcLevelFromXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  for (let i = 2; i <= MAX_LEVEL; i += 1) {
    const threshold = 50 * i * (i + 1);
    if (xp >= threshold) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

const completeMission = async (req, res) => {
  const userNumber = req.user.user_number;
  const userMissionId = req.params.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      "UPDATE User_missions SET mission_status = 'completed', completed_at = NOW() WHERE user_mission_id = ? AND Users_user_number = ? AND mission_status = 'assigned'",
      [userMissionId, userNumber],
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({ message: '이미 완료되었거나 배정되지 않은 미션입니다.' });
    }

    const [[missionInfo]] = await connection.query(
      "SELECT m.base_point, m.Missions_id FROM User_missions um JOIN Missions m ON um.Missions_id = m.Missions_id WHERE um.user_mission_id = ?",
      [userMissionId],
    );

    const [[subscription]] = await connection.query(
      "SELECT plan, sub_status, expires_at FROM Subscriptions WHERE Users_user_number = ?",
      [userNumber],
    );

    const isPremium = subscription && subscription.plan === 'premium' && new Date(subscription.expires_at) > new Date();
    const multiplier = isPremium ? 1.5 : 1.0;
    const basePoint = Number(missionInfo?.base_point ?? 0);
    const earnedAmount = Math.floor(basePoint * multiplier);

    await connection.query(
      "INSERT INTO Point_transactions (Users_user_number, source, ref_id, base_point, multiplier, amount, created_at) VALUES (?, 'mission_complete', ?, ?, ?, ?, NOW())",
      [userNumber, userMissionId, basePoint, multiplier, earnedAmount],
    );

    const [[charRow]] = await connection.query(
      "SELECT total_earned_xp FROM Characters WHERE Users_user_number = ? FOR UPDATE",
      [userNumber],
    );
    const nextXp = Number(charRow?.total_earned_xp ?? 0) + earnedAmount;
    const nextLevel = calcLevelFromXp(nextXp);

    await connection.query(
      "UPDATE Characters SET total_earned_xp = ?, level = ? WHERE Users_user_number = ?",
      [nextXp, nextLevel, userNumber],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: '미션 완료 처리되었습니다.',
      data: { earned_point: earnedAmount, multiplier, total_earned_xp: nextXp, level: nextLevel },
    });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    console.error('Complete Mission Error:', error);
    return res.status(500).json({ message: '미션 완료 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
};

module.exports = { completeMission, calcLevelFromXp };