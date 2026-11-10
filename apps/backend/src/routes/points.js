const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// 모든 포인트 라우트에 인증 미들웨어 적용
router.use(verifyToken);

// 포인트 잔액 및 내역 조회 예시
router.get('/', async (req, res, next) => {
    try {
        const userNumber = req.user.user_number;
        // 필요시 포인트 관련 컨트롤러 로직 연결
        res.status(200).json({ 
            success: true, 
            data: { userNumber, balance: 0, message: '포인트 조회 성공' } 
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
