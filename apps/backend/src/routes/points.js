const express = require('express');
const router = express.Router();

// 포인트 관련 라우터 예시 (필요에 따라 컨트롤러 연동)
router.get('/:userNumber', (req, res) => {
    res.json({ success: true, message: '포인트 조회 API' });
});

module.exports = router;