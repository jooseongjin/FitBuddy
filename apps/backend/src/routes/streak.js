const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { getStreak, repairStreak } = require('../services/progress');

const router = express.Router();
const repairSchema = z.object({
  missed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['points', 'free']),
});

router.get('/', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await getStreak(req.user.user_number) });
  } catch (error) {
    next(error);
  }
});

router.post('/repair', auth, async (req, res, next) => {
  try {
    const request = repairSchema.parse(req.body);
    await repairStreak(req.user.user_number, request);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;