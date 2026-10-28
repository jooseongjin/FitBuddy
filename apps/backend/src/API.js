const db = require('../../../db');

// API-06: Point_transactions 원장 기반 포인트 잔액 실시간 조회 (ADR-03)
const getPointBalance = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const [rows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance 
       FROM point_transactions 
       WHERE user_id = ?`,
      [userId]
    );

    const balance = rows[0].balance;

    return res.status(200).json({
      success: true,
      data: {
        balance,
      },
    });
  } catch (error) {
    console.error('포인트 잔액 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
};

module.exports = {
  getPointBalance,
};
