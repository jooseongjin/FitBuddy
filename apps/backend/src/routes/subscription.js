const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { getSubscription, subscribe } = require('../services/subscription');

const router = express.Router();
// mock_result: 모의 결제 결과를 정한다 (시연·테스트용, 기본 success)
const subscribeSchema = z.object({
  plan: z.literal('premium'),
  mock_result: z.enum(['success', 'fail']).optional(),
});

router.get('/', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await getSubscription(req.user.user_number) });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const request = subscribeSchema.parse(req.body);
    res.json({ success: true, data: await subscribe(req.user.user_number, request.mock_result) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
