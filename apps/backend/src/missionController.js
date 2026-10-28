const db = require('../db');

// API-04: 오늘의 추천 미션 조회
const getRecommendedMissions = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const [rows] = await db.query(
      `SELECT m.mission_id, m.title, m.description, m.reward_points, m.reward_exp, um.status
       FROM missions m
       LEFT JOIN user_missions um ON m.mission_id = um.mission_id AND um.user_id = ?
       WHERE um.status IS NULL OR um.status = 'assigned'
       LIMIT 5`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('추천 미션 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
};

module.exports = {
  getRecommendedMissions,
};
