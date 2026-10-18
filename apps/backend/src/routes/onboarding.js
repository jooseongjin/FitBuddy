const express = require('express');
const { z } = require('zod');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ApiError } = require('../errors');

const router = express.Router();

const AVOID = ['jump', 'prone', 'knee_bend', 'floor'];
const LIMIT = ['knee', 'back', 'shoulder', 'wrist', 'ankle'];

const schema = z.object({
  goal: z.enum(['diet', 'muscle', 'stamina']),
  exerciseExperience: z.enum(['none', 'monthly', 'weekly', 'daily']),
  exercisePlace: z.enum(['indoor', 'outdoor']),
  avoidMotion: z.array(z.enum(AVOID)).default([]),   // 실내일 때만 의미 있음
  bodyLimit: z.array(z.enum(LIMIT)).default([]),
});

const toSet = (arr) => [...new Set(arr)].join(',');
const fromSet = (s) => (s ? s.split(',') : []);
const view = (r) => ({
  goal: r.goal,
  exerciseExperience: r.exercise_experience,
  exercisePlace: r.exercise_place,
  avoidMotion: fromSet(r.avoid_motion),
  bodyLimit: fromSet(r.body_limit),
});

// POST /api/v1/onboarding  : 최초 저장 (이미 있으면 409)
router.post('/', auth, async (req, res, next) => {
  try {
    const b = schema.parse(req.body);
    // 실외면 피할 동작 질문이 없으므로 저장하지 않음 (추천 프로시저도 실내에서만 사용)
    const avoid = b.exercisePlace === 'indoor' ? toSet(b.avoidMotion) : '';
    try {
      await pool.query(
        `INSERT INTO Onboarding_profiles (Users_user_number, goal, exercise_experience, exercise_place, avoid_motion, body_limit)
         VALUES (?,?,?,?,?,?)`,
        [req.user.userNumber, b.goal, b.exerciseExperience, b.exercisePlace, avoid, toSet(b.bodyLimit)]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'ONBOARDING_EXISTS', '이미 온보딩을 완료했습니다. PUT으로 수정하세요.');
      throw e;
    }
    res.status(201).json({ goal: b.goal, exerciseExperience: b.exerciseExperience, exercisePlace: b.exercisePlace,
      avoidMotion: fromSet(avoid), bodyLimit: [...new Set(b.bodyLimit)] });
  } catch (e) { next(e); }
});

// PUT /api/v1/onboarding : 설문 수정 (추천에는 다음 배정부터 반영)
router.put('/', auth, async (req, res, next) => {
  try {
    const b = schema.parse(req.body);
    const avoid = b.exercisePlace === 'indoor' ? toSet(b.avoidMotion) : '';
    const [r] = await pool.query(
      `UPDATE Onboarding_profiles SET goal=?, exercise_experience=?, exercise_place=?, avoid_motion=?, body_limit=?
       WHERE Users_user_number=?`,
      [b.goal, b.exerciseExperience, b.exercisePlace, avoid, toSet(b.bodyLimit), req.user.userNumber]);
    if (!r.affectedRows) throw new ApiError(404, 'ONBOARDING_NOT_FOUND', '온보딩 정보가 없습니다. 먼저 POST로 저장하세요.');
    res.json({ goal: b.goal, exerciseExperience: b.exerciseExperience, exercisePlace: b.exercisePlace,
      avoidMotion: fromSet(avoid), bodyLimit: [...new Set(b.bodyLimit)] });
  } catch (e) { next(e); }
});

// GET /api/v1/onboarding
router.get('/', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Onboarding_profiles WHERE Users_user_number = ?', [req.user.userNumber]);
    if (!rows[0]) throw new ApiError(404, 'ONBOARDING_NOT_FOUND', '온보딩 정보가 없습니다.');
    res.json(view(rows[0]));
  } catch (e) { next(e); }
});

module.exports = router;
