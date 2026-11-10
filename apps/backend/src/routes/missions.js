const express = require('express');
const router = express.Router();
const missionController = require('../missionController');
// 팀원 공통 인증 미들웨어 경로에 맞게 임포트 (예: middleware/auth 또는 인증 파일 위치)
const { verifyToken } = require('../middleware/auth'); 

// 모든 미션 라우트에 인증 미들웨어 적용
router.use(verifyToken);

// 추천/오늘의 미션 조회 (GET /api/v1/missions)
router.get('/', missionController.getTodayMissions);

// 미션 완료 처리 (POST /api/v1/missions/complete)
router.post('/complete', missionController.completeMission);

module.exports = router;
