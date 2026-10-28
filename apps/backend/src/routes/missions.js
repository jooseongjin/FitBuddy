const express = require('express');
const router = express.Router();

// 컨트롤러 함수 불러오기 (파일 위치에 맞춘 상대 경로)
const { getRecommendedMissions } = require('../missionController');
const { completeMission } = require('../complete');

// 라우트 설정
router.get('/recommended', getRecommendedMissions);
router.post('/:id/complete', completeMission);

module.exports = router;