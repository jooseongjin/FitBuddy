const express = require('express');
const auth = require('../middleware/auth');
const { getRecommendedMissions, completeMission } = require('../controllers/missionController');

const router = express.Router();
router.get('/recommended', auth, getRecommendedMissions);
router.post('/:id/complete', auth, completeMission);
module.exports = router;
