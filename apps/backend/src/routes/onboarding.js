const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ApiError } = require('../errors');

const router = express.Router();

const AVOID = ['jump', 'prone', 'knee_bend', 'floor'];
const LIMIT = ['knee', 'back', 'shoulder', 'wrist', 'ankle'];

// TRD API-03 필드명 (snake_case)
const schema = z.object({
  goal: z.enum(['diet', 'muscle', 'stamina']),
  exercise_experience: z.enum(['none', 'monthly', 'weekly', 'daily']),
  exercise_place: z.enum(['indoor', 'outdoor']),
  avoid_motion: z.array(z.enum(AVOID)).default([]), // 실내일 때만 의미 있음
  body_limit: z.array(z.enum(LIMIT)).default([]),
});

const toSet = (arr) => [...new Set(arr)].join(',');
const fromSet = (s) => (s ? s.split(',') : []);
const view = (r) => ({
  goal: r.goal,
  exercise_experience: r.exercise_experience,
  exercise_place: r.exercise_place,
  avoid_motion: fromSet(r.avoid_motion),
  body_limit: fromSet(r.body_limit),
});
const readProfile = async (userNumber) => {
  const [rows] = await pool.query('SELECT * FROM Onboarding_profiles WHERE Users_user_number = ?', [userNumber]);
  return rows[0];
};

// POST /api/v1/onboarding  (API-03) : 최초 저장, 이미 있으면 409
router.post('/', auth, async (req, res, next) => {
  try {
    const b = schema.parse(req.body);
    // 실외면 피할 동작 질문이 없으므로 저장하지 않음 (추천 프로시저도 실내에서만 사용)
    const avoid = b.exercise_place === 'indoor' ? toSet(b.avoid_motion) : '';
    try {
      await pool.query(
        `INSERT INTO Onboarding_profiles (Users_user_number, goal, exercise_experience, exercise_place, avoid_motion, body_limit)
         VALUES (?,?,?,?,?,?)`,
        [req.user.user_number, b.goal, b.exercise_experience, b.exercise_place, avoid, toSet(b.body_limit)]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'ONBOARDING_EXISTS', '이미 온보딩을 완료했습니다. PUT으로 수정하세요.');
      throw e;
    }
    res.status(201).json({ success: true, data: view(await readProfile(req.user.user_number)) });
  } catch (e) { next(e); }
});

// PUT /api/v1/onboarding : 설문 수정 (추천에는 다음 배정부터 반영)
router.put('/', auth, async (req, res, next) => {
  try {
    const b = schema.parse(req.body);
    const avoid = b.exercise_place === 'indoor' ? toSet(b.avoid_motion) : '';
    const [r] = await pool.query(
      `UPDATE Onboarding_profiles SET goal=?, exercise_experience=?, exercise_place=?, avoid_motion=?, body_limit=?
       WHERE Users_user_number=?`,
      [b.goal, b.exercise_experience, b.exercise_place, avoid, toSet(b.body_limit), req.user.user_number]);
    if (!r.affectedRows) throw new ApiError(404, 'ONBOARDING_NOT_FOUND', '온보딩 정보가 없습니다. 먼저 POST로 저장하세요.');
    res.json({ success: true, data: view(await readProfile(req.user.user_number)) });
  } catch (e) { next(e); }
});

// GET /api/v1/onboarding
router.get('/', auth, async (req, res, next) => {
  try {
    const p = await readProfile(req.user.user_number);
    if (!p) throw new ApiError(404, 'ONBOARDING_NOT_FOUND', '온보딩 정보가 없습니다.');
    res.json({ success: true, data: view(p) });
  } catch (e) { next(e); }
});

module.exports = router;
