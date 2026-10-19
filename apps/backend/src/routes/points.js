const express = require('express');
const auth = require('../middleware/auth');
const { getPointBalance } = require('../controllers/pointController');

const router = express.Router();
router.get('/balance', auth, getPointBalance);
module.exports = router;
