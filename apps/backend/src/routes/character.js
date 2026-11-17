const express = require('express');
const auth = require('../middleware/auth');
const { getCharacter } = require('../services/progress');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await getCharacter(req.user.user_number) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;