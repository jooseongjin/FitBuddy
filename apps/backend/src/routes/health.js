const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const pool = require('../db');
const { todayKST } = require('../services/progress');

const router = express.Router();
const syncSchema = z.object({
  steps: z.number().int().min(0).max(200000),
  active_calories: z.number().int().min(0).max(20000),
  exercise_minutes: z.number().int().min(0).max(1440),
  source: z.enum(['healthkit', 'health_connect']),
});

router.get('/today', auth, async (req, res, next) => {
  try {
    const date = todayKST();
    const [[summary]] = await pool.query(
      `SELECT metric_date, steps, active_calories, exercise_minutes, source, synced_at
         FROM Health_daily_summaries
        WHERE Users_user_number = ? AND metric_date = ?`,
      [req.user.user_number, date],
    );
    res.json({
      success: true,
      data: summary
        ? { ...summary, steps: Number(summary.steps), active_calories: Number(summary.active_calories), exercise_minutes: Number(summary.exercise_minutes) }
        : { metric_date: date, steps: 0, active_calories: 0, exercise_minutes: 0, source: null, synced_at: null },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/today', auth, async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const summary = syncSchema.parse(req.body);
    const date = todayKST();
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO Health_daily_summaries
         (Users_user_number, metric_date, steps, active_calories, exercise_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE steps = VALUES(steps), active_calories = VALUES(active_calories),
                               exercise_minutes = VALUES(exercise_minutes), source = VALUES(source)`,
      [req.user.user_number, date, summary.steps, summary.active_calories, summary.exercise_minutes, summary.source],
    );
    await connection.query(
      `UPDATE User_missions um
         JOIN Missions m ON m.Missions_id = um.Missions_id
         JOIN Health_daily_summaries h
           ON h.Users_user_number = um.Users_user_number AND h.metric_date = um.assigned_date
          SET um.progress_value = LEAST(m.target_value,
                CASE m.target_unit
                  WHEN '걸음' THEN h.steps
                  WHEN '분' THEN h.exercise_minutes
                  WHEN 'kcal' THEN h.active_calories
                  ELSE um.progress_value
                END)
        WHERE um.Users_user_number = ? AND um.assigned_date = ?
          AND um.mission_status = 'assigned' AND m.target_unit IN ('걸음', '분', 'kcal')`,
      [req.user.user_number, date],
    );
    await connection.commit();
    const [[saved]] = await connection.query(
      `SELECT metric_date, steps, active_calories, exercise_minutes, source, synced_at
         FROM Health_daily_summaries
        WHERE Users_user_number = ? AND metric_date = ?`,
      [req.user.user_number, date],
    );
    res.json({ success: true, data: saved });
  } catch (error) {
    await connection.rollback().catch(() => {});
    next(error);
  } finally {
    connection?.release();
  }
});

module.exports = router;