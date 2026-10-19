// controllers/pointController.js
const getPointBalance = async (req, res) => {
  try {
    const userNumber = req.user.user_number;

    // ADR-03: Point_transactions 원장 내역의 SUM(amount) 계산
    const [[result]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance
       FROM Point_transactions
       WHERE Users_user_number = ?`,
      [userNumber]
    );

    return res.status(200).json({
      success: true,
      balance: Number(result.balance)
    });
  } catch (error) {
    console.error('Point Balance Error:', error);
    return res.status(500).json({ message: '포인트 잔액 조회 중 오류가 발생했습니다.' });
  }
};