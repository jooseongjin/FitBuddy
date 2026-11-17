const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const pool = require('../db');
const { todayKST } = require('../services/progress');

const router = express.Router();
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const kstDateKey = (value) => new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const recordSchema = z.object({
  external_id: z.string().min(1).max(100),
  record_type: z.enum(['steps', 'exercise', 'calories', 'distance']),
  exercise_type: z.string().max(30).nullable().optional(),
  value: z.number().min(0).max(200000),
  unit: z.enum(['count', 'min', 'kcal', 'm']),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  source_app: z.string().max(100).nullable().optional(),
  device_type: z.enum(['watch', 'phone', 'other', 'unknown']).default('unknown'),
}).superRefine((record, context) => {
  const start = new Date(record.start_at);
  const end = new Date(record.end_at);
  const today = todayKST();
  const tomorrowStart = new Date(`${addDays(today, 1)}T00:00:00+09:00`);
  if (start > end || kstDateKey(record.start_at) !== today || end > tomorrowStart) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Health record must fall within today KST.' });
  }
});

const syncSchema = z.object({
  steps: z.number().int().min(0).max(200000),
  active_calories: z.number().int().min(0).max(20000),
  exercise_minutes: z.number().int().min(0).max(1440),
  source: z.enum(['healthkit', 'health_connect']),
  records: z.array(recordSchema).max(1000).default([]),
});

const trustedSourceIds = new Set(
  (process.env.HEALTH_TRUSTED_SOURCE_IDS ?? 'com.sec.android.app.shealth,com.google.android.apps.healthdata,com.google.android.apps.fitness')
    .split(',').map((source) => source.trim()).filter(Boolean),
);

router.get('/today', auth, async (req, res, next) => {
  try {
    const date = todayKST();
    const [[summary]] = await pool.query(
      `SELECT d.activity_date AS metric_date, d.steps, d.calories_kcal AS active_calories,
              d.active_minutes AS exercise_minutes,
              (SELECT c.platform FROM Health_connections c
                WHERE c.Users_user_number = d.Users_user_number AND c.conn_status = 'connected'
                ORDER BY c.last_synced_at DESC LIMIT 1) AS source,
              (SELECT c.last_synced_at FROM Health_connections c
                WHERE c.Users_user_number = d.Users_user_number AND c.conn_status = 'connected'
                ORDER BY c.last_synced_at DESC LIMIT 1) AS synced_at
         FROM Daily_activity d
        WHERE d.Users_user_number = ? AND d.activity_date = ?`,
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
      `INSERT INTO Health_connections (Users_user_number, platform, conn_status, last_synced_at)
       VALUES (?, ?, 'connected', NOW())
       ON DUPLICATE KEY UPDATE conn_status = 'connected', last_synced_at = NOW()`,
      [req.user.user_number, summary.source],
    );

    const records = summary.records.map((record) => {
      const sourceApp = record.source_app ?? null;
      const recordingMethod = sourceApp && trustedSourceIds.has(sourceApp)
        ? (record.record_type === 'exercise' ? 'active' : 'automatic')
        : 'unknown';
      const startAt = new Date(new Date(record.start_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const endAt = new Date(new Date(record.end_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      return [req.user.user_number, summary.source, record.external_id, record.record_type,
        record.exercise_type ?? null, record.value, record.unit, startAt, endAt,
        sourceApp, record.device_type, recordingMethod];
    });
    if (records.length) {
      await connection.query(
        `INSERT IGNORE INTO Activity_records
           (Users_user_number, platform, external_id, record_type, exercise_type, value, unit,
            start_at, end_at, source_app, device_type, recording_method)
         VALUES ?`,
        [records],
      );
    }

    await connection.query(
      `INSERT INTO Daily_activity
         (Users_user_number, activity_date, steps, verified_steps, active_minutes, calories_kcal)
       VALUES (?, ?, 0, 0, 0, 0)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [req.user.user_number, date],
    );
    await connection.query(
      `UPDATE Daily_activity d
          SET d.steps = (SELECT COALESCE(SUM(ar.value), 0) FROM Activity_records ar
                          WHERE ar.Users_user_number = d.Users_user_number AND ar.record_type = 'steps'
                            AND ar.start_at >= ? AND ar.start_at < ?),
              d.verified_steps = (SELECT COALESCE(SUM(ar.value), 0) FROM Activity_records ar
                                   WHERE ar.Users_user_number = d.Users_user_number AND ar.record_type = 'steps'
                                     AND ar.is_trusted = 1 AND ar.start_at >= ? AND ar.start_at < ?),
              d.active_minutes = (SELECT COALESCE(SUM(ar.value), 0) FROM Activity_records ar
                                   WHERE ar.Users_user_number = d.Users_user_number AND ar.record_type = 'exercise'
                                     AND ar.is_trusted = 1 AND ar.start_at >= ? AND ar.start_at < ?),
              d.calories_kcal = (SELECT COALESCE(SUM(ar.value), 0) FROM Activity_records ar
                                  WHERE ar.Users_user_number = d.Users_user_number AND ar.record_type = 'calories'
                                    AND ar.start_at >= ? AND ar.start_at < ?)
        WHERE d.Users_user_number = ? AND d.activity_date = ?`,
      [`${date} 00:00:00`, `${addDays(date, 1)} 00:00:00`,
        `${date} 00:00:00`, `${addDays(date, 1)} 00:00:00`,
        `${date} 00:00:00`, `${addDays(date, 1)} 00:00:00`,
        `${date} 00:00:00`, `${addDays(date, 1)} 00:00:00`, req.user.user_number, date],
    );
    await connection.query(
      `UPDATE User_missions um
         JOIN Missions m ON m.Missions_id = um.Missions_id
         LEFT JOIN Mission_verify_rules r ON r.Missions_id = m.Missions_id
         JOIN Daily_activity h
           ON h.Users_user_number = um.Users_user_number AND h.activity_date = um.assigned_date
          SET um.progress_value = LEAST(m.target_value,
                CASE
                  WHEN r.metric = 'steps' THEN FLOOR(h.verified_steps * m.target_value / r.min_value)
                  WHEN r.metric = 'exercise_minutes' THEN h.active_minutes
                  WHEN m.target_unit = '걸음' THEN h.verified_steps
                  WHEN m.target_unit = 'kcal' THEN (
                    SELECT COALESCE(SUM(ar.value), 0) FROM Activity_records ar
                     WHERE ar.Users_user_number = um.Users_user_number AND ar.record_type = 'calories'
                       AND ar.is_trusted = 1 AND ar.start_at >= ? AND ar.start_at < ?
                  )
                  ELSE um.progress_value
                END)
        WHERE um.Users_user_number = ? AND um.assigned_date = ?
          AND um.mission_status = 'assigned' AND m.target_unit IN ('걸음', '분', 'kcal')`,
      [`${date} 00:00:00`, `${addDays(date, 1)} 00:00:00`, req.user.user_number, date],
    );
    await connection.commit();
    const [[saved]] = await connection.query(
      `SELECT d.activity_date AS metric_date, d.steps, d.calories_kcal AS active_calories,
              d.active_minutes AS exercise_minutes,
              (SELECT c.platform FROM Health_connections c
                WHERE c.Users_user_number = d.Users_user_number AND c.conn_status = 'connected'
                ORDER BY c.last_synced_at DESC LIMIT 1) AS source,
              (SELECT c.last_synced_at FROM Health_connections c
                WHERE c.Users_user_number = d.Users_user_number AND c.conn_status = 'connected'
                ORDER BY c.last_synced_at DESC LIMIT 1) AS synced_at
         FROM Daily_activity d
        WHERE d.Users_user_number = ? AND d.activity_date = ?`,
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