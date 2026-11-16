const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const { getBalance } = require('../services/progress');
const { ApiError } = require('../errors');

const router = express.Router();

router.get('/balance', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: { balance: await getBalance(req.user.user_number) } });
  } catch (error) {
    next(error);
  }
});

router.get('/history', auth, async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', '페이지 번호 또는 페이지 크기가 올바르지 않습니다.');
    }
    const [items] = await pool.query(
      `SELECT pt.transaction_id, pt.source, pt.amount, pt.created_at,
              COALESCE(m.title, ci.item_name, rr.reward_name) AS title
         FROM Point_transactions pt
         LEFT JOIN User_missions um ON pt.source = 'mission_complete' AND pt.ref_id = um.user_mission_id
         LEFT JOIN Missions m ON m.Missions_id = um.Missions_id
         LEFT JOIN Customization_items ci ON pt.source = 'shop_purchase' AND pt.ref_id = ci.item_id
         LEFT JOIN Reward_redemptions rd ON pt.source = 'reward_redeem' AND pt.ref_id = rd.redemption_id
         LEFT JOIN Rewards rr ON rr.reward_id = rd.Rewards_reward_id
        WHERE pt.Users_user_number = ?
        ORDER BY pt.transaction_id DESC
        LIMIT ? OFFSET ?`,
      [req.user.user_number, size + 1, (page - 1) * size],
    );
    const hasMore = items.length > size;
    if (hasMore) items.pop();
    res.json({ success: true, data: { items, has_more: hasMore } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;