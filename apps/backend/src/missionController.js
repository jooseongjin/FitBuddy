// controllers/missionController.js
const getRecommendedMissions = async (req, res) => {
  try {
    const userNumber = req.user.user_number; // 인증 미들웨어에서 추출한 유저 번호
    
    // KST 기준 오늘 날짜 (YYYY-MM-DD)
    const todayKST = new Date(new Date().getTime() + (9 * 60 * 60 * 1000))
                      .toISOString().split('T')[0];

    // 1. 오늘 날짜에 배정된 미션이 있는지 조회
    let assignedMissions = await db.query(
      `SELECT um.user_mission_id, m.Missions_id, m.title, m.description, m.difficulty, m.base_point, um.mission_status
       FROM User_missions um
       JOIN Missions m ON um.Missions_id = m.Missions_id
       WHERE um.Users_user_number = ? AND um.assigned_date = ?`,
      [userNumber, todayKST]
    );

    // 2. 배정된 미션이 없다면 신규 배정 (Rule-based 또는 활성화된 미션 중 추출)
    if (assignedMissions.length === 0) {
      const activeMissions = await db.query(
        `SELECT Missions_id FROM Missions WHERE is_active = TRUE LIMIT 3`
      );

      for (const mission of activeMissions) {
        await db.query(
          `INSERT INTO User_missions (Users_user_number, Missions_id, mission_status, assigned_date, assigned_at)
           VALUES (?, ?, 'assigned', ?, NOW())`,
          [userNumber, mission.Missions_id, todayKST]
        );
      }

      // 재조회
      assignedMissions = await db.query(
        `SELECT um.user_mission_id, m.Missions_id, m.title, m.description, m.difficulty, m.base_point, um.mission_status
         FROM User_missions um
         JOIN Missions m ON um.Missions_id = m.Missions_id
         WHERE um.Users_user_number = ? AND um.assigned_date = ?`,
        [userNumber, todayKST]
      );
    }

    return res.status(200).json({
      success: true,
      data: assignedMissions
    });
  } catch (error) {
    console.error('Recommended Missions Error:', error);
    return res.status(500).json({ message: '추천 미션 조회 중 오류가 발생했습니다.' });
  }
};