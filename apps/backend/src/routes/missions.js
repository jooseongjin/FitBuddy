const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { getTodayMissions } = require('../services/recommend');
const { completeMission, todayKST } = require('../services/progress');
const pool = require('../db');
const { ApiError } = require('../errors');

const router = express.Router();
const progressSchema = z.object({ increment: z.literal(1) });
const toDateKey = (value) => value instanceof Date
  ? new Date(value.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  : String(value).slice(0, 10);

const recommended = async (req, res, next) => {
  try {
    const missions = await getTodayMissions(req.user.user_number);
    res.json({ success: true, data: missions });
  } catch (error) {
    next(error);
  }
};

router.get('/recommended', auth, recommended);
router.get('/today', auth, recommended);

router.post('/:id/progress', auth, async (req, res, next) => {
  try {
    const { increment } = progressSchema.parse(req.body);
    const missionId = Number(req.params.id);
    if (!Number.isSafeInteger(missionId) || missionId < 1) throw new ApiError(400, 'VALIDATION_ERROR', '미션 번호가 올바르지 않습니다.');
    const [[mission]] = await pool.query(
      `SELECT um.mission_status, um.assigned_date, um.progress_value, m.target_value, m.target_unit
         FROM User_missions um JOIN Missions m ON m.Missions_id = um.Missions_id
        WHERE um.user_mission_id = ? AND um.Users_user_number = ?`,
      [missionId, req.user.user_number],
    );
    if (!mission) throw new ApiError(404, 'MISSION_NOT_FOUND', '배정된 미션을 찾을 수 없습니다.');
    if (toDateKey(mission.assigned_date) !== todayKST()) throw new ApiError(409, 'MISSION_NOT_TODAY', '오늘 배정된 미션만 기록할 수 있습니다.');
    if (mission.mission_status !== 'assigned') throw new ApiError(409, 'MISSION_ALREADY_COMPLETED', '이미 완료한 미션입니다.');
    if (mission.target_unit !== '회') throw new ApiError(400, 'MANUAL_PROGRESS_UNSUPPORTED', '이 미션의 진행도는 건강 데이터로 자동 계산됩니다.');

    await pool.query(
      `UPDATE User_missions um JOIN Missions m ON m.Missions_id = um.Missions_id
          SET um.progress_value = LEAST(m.target_value, um.progress_value + ?)
        WHERE um.user_mission_id = ? AND um.Users_user_number = ? AND um.mission_status = 'assigned'`,
      [increment, missionId, req.user.user_number],
    );
    const [[updated]] = await pool.query(
      'SELECT progress_value FROM User_missions WHERE user_mission_id = ? AND Users_user_number = ?',
      [missionId, req.user.user_number],
    );
    res.json({ success: true, data: { current_value: Number(updated.progress_value), target_value: Number(mission.target_value) } });
  } catch (error) {
    next(error);
  }
});

const complete = async (req, res, next, missionId = req.params.id) => {
  try {
  const data = await completeMission(req.user.user_number, Number(missionId));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

router.post('/:id/complete', auth, (req, res, next) => complete(req, res, next));
router.post('/today/:missionId/complete', auth, (req, res, next) => complete(req, res, next, req.params.missionId));

module.exports = router;
