const express = require('express');
const router = express.Router();
const missionController = require('../missionController');

// 미션 조회 및 완료 처리 라우터
router.get('/', missionController.getMissions);
router.post('/complete', missionController.completeMission);

module.exports = router;