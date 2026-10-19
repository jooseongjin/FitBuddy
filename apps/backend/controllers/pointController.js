// controllers/pointController.js : GET /api/v1/points/balance
const db = require('../db');

const getPointBalance = async (req, res, next) => {
  try {
    const userNumber = req.user.userNumber;
    // ADR-03: Point_transactions 원장의 SUM(amount)
    const [[result]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance FROM Point_transactions WHERE Users_user_number = ?`,
      [userNumber]);
    return res.status(200).json({ success: true, balance: Number(result.balance) });
  } catch (error) { next(error); }
};

module.exports = { getPointBalance };
