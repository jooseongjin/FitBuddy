const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { listRewards, redeemReward, listRedemptions } = require('../services/rewards');

const router = express.Router();
const idSchema = z.coerce.number().int().positive();

router.get('/', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await listRewards(req.user.user_number) });
  } catch (error) {
    next(error);
  }
});

// 내 기프티콘 보관함 (경로가 /:id/redeem 보다 먼저 와도 충돌하지 않는다)
router.get('/redemptions', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await listRedemptions(req.user.user_number) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/redeem', auth, async (req, res, next) => {
  try {
    const rewardId = idSchema.parse(req.params.id);
    res.json({ success: true, data: await redeemReward(req.user.user_number, rewardId) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
