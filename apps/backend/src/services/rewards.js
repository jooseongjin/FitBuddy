const pool = require('../db');
const { ApiError } = require('../errors');
const { getBalance, getPlan } = require('./progress');

// 기프티콘 목록 (API-13). 노출 중인 상품만, 잠금(Premium 전용)·품절 여부를 함께 알려준다.
async function listRewards(userNumber) {
  const plan = await getPlan(userNumber);
  const [rows] = await pool.query(
    `SELECT reward_id, reward_name, required_point, stock, is_premium_only, image_key
       FROM Rewards WHERE is_active = TRUE ORDER BY required_point, reward_id`,
  );
  return {
    plan,
    balance: await getBalance(userNumber),
    items: rows.map((row) => ({
      reward_id: row.reward_id,
      reward_name: row.reward_name,
      required_point: Number(row.required_point),
      stock: Number(row.stock),
      is_premium_only: Boolean(row.is_premium_only),
      image_key: row.image_key,
      sold_out: Number(row.stock) <= 0,
      locked: Boolean(row.is_premium_only) && plan !== 'premium',
    })),
  };
}

// 즉시 교환 (API-14): 사용자 행 잠금 → 검증 → 재고 조건부 차감 → 교환 기록 + 포인트 원장을 한 트랜잭션으로 처리한다.
async function redeemReward(userNumber, rewardId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT user_number FROM Users WHERE user_number = ? FOR UPDATE', [userNumber]);

    const [[reward]] = await connection.query(
      `SELECT reward_id, reward_name, required_point, stock, is_premium_only, image_key
         FROM Rewards WHERE reward_id = ? AND is_active = TRUE FOR UPDATE`,
      [rewardId],
    );
    if (!reward) throw new ApiError(404, 'REWARD_NOT_FOUND', '교환할 상품을 찾을 수 없습니다.');
    if (reward.is_premium_only && (await getPlan(userNumber, connection)) !== 'premium') {
      throw new ApiError(403, 'PREMIUM_REQUIRED', 'Premium 사용자만 교환할 수 있는 상품입니다.');
    }
    if (Number(reward.stock) <= 0) throw new ApiError(409, 'OUT_OF_STOCK', '재고가 소진된 상품입니다.');
    const required = Number(reward.required_point);
    if ((await getBalance(userNumber, connection)) < required) {
      throw new ApiError(409, 'INSUFFICIENT_POINTS', 'FitPoint가 부족합니다.');
    }

    const [stockUpdate] = await connection.query(
      'UPDATE Rewards SET stock = stock - 1 WHERE reward_id = ? AND stock > 0',
      [rewardId],
    );
    if (stockUpdate.affectedRows !== 1) throw new ApiError(409, 'OUT_OF_STOCK', '재고가 소진된 상품입니다.');

    const [redemption] = await connection.query(
      "INSERT INTO Reward_redemptions (Users_user_number, Rewards_reward_id, redemption_type, redemption_status) VALUES (?, ?, 'exchange', 'completed')",
      [userNumber, rewardId],
    );
    await connection.query(
      "INSERT INTO Point_transactions (Users_user_number, source, ref_id, amount) VALUES (?, 'reward_redeem', ?, ?)",
      [userNumber, redemption.insertId, -required],
    );
    const balance = await getBalance(userNumber, connection);
    await connection.commit();
    return {
      redemption_id: redemption.insertId,
      redemption_status: 'completed',
      balance,
      reward: {
        reward_id: reward.reward_id,
        reward_name: reward.reward_name,
        required_point: required,
        image_key: reward.image_key,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 내 기프티콘 보관함: 교환한 상품을 최근 순으로 보여준다.
async function listRedemptions(userNumber) {
  const [rows] = await pool.query(
    `SELECT rd.redemption_id, rd.redemption_status, rd.redeemed_at,
            r.reward_id, r.reward_name, r.required_point, r.image_key
       FROM Reward_redemptions rd
       JOIN Rewards r ON r.reward_id = rd.Rewards_reward_id
      WHERE rd.Users_user_number = ?
      ORDER BY rd.redemption_id DESC`,
    [userNumber],
  );
  return {
    items: rows.map((row) => ({
      redemption_id: row.redemption_id,
      redemption_status: row.redemption_status,
      redeemed_at: row.redeemed_at,
      reward: {
        reward_id: row.reward_id,
        reward_name: row.reward_name,
        required_point: Number(row.required_point),
        image_key: row.image_key,
      },
    })),
  };
}

module.exports = { listRewards, redeemReward, listRedemptions };
