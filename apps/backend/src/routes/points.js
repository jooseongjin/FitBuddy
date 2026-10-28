const express = require('express');
const router = express.Router();

// 컨트롤러 함수 불러오기 (API.js에 있는 잔액 조회 함수)
const { getPointBalance } = require('../API');

// 라우트 설정
router.get('/balance', getPointBalance);

module.exports = router;