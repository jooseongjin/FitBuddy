const express = require('express');
const router = express.Router();
const missionController = require('../missionController');

const { verifyToken } = require('../middleware/auth'); 


router.use(verifyToken);

router.get('/', missionController.getTodayMissions);


router.post('/complete', missionController.completeMission);

module.exports = router;
