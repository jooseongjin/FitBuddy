const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { ApiError } = require('../errors');

const router = express.Router();

// 검증 규칙은 프론트(Signup.tsx)의 validate()와 동일한 수준 + DB 컬럼 길이 제한
//   nickname: 필수(최대 16자) / email: 형식 / user_id: 필수(최대 30자) / password: 8자 이상
const signupSchema = z.object({
  user_id: z.string().trim().min(1, '아이디를 입력해주세요.').max(30, '아이디는 30자 이하'),
  password: z.string().min(8, '비밀번호는 8자 이상').max(72, '비밀번호는 72자 이하'),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '올바른 이메일 주소를 입력해주세요.').max(255),
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요.').max(16, '닉네임은 16자 이하'),
});
// 로그인 화면은 "아이디 또는 이메일"을 user_id 필드로 보냄
const loginSchema = z.object({ user_id: z.string().trim().min(1), password: z.string().min(1) });

// POST /api/v1/auth/signup  (API-01)
// Users + Streaks + Characters 를 한 트랜잭션으로 생성
router.post('/signup', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = signupSchema.parse(req.body);
    const hash = await bcrypt.hash(b.password, 10);
    await conn.beginTransaction();
    let userNumber;
    try {
      const [r] = await conn.query(
        'INSERT INTO Users (user_id, password_hash, email, nickname) VALUES (?,?,?,?)',
        [b.user_id, hash, b.email.toLowerCase(), b.nickname]
      );
      userNumber = r.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        const isEmail = /uq_users_email/.test(e.message);
        throw new ApiError(409, isEmail ? 'EMAIL_TAKEN' : 'USER_ID_TAKEN',
          isEmail ? '이미 사용 중인 이메일입니다.' : '이미 사용 중인 아이디입니다.');
      }
      throw e;
    }
    await conn.query('INSERT INTO Streaks (Users_user_number) VALUES (?)', [userNumber]);
    await conn.query('INSERT INTO `Characters` (Users_user_number) VALUES (?)', [userNumber]);
    await conn.commit();
    res.status(201).json({ success: true, data: { user_number: userNumber, user_id: b.user_id, nickname: b.nickname } });
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
});

// POST /api/v1/auth/login  (API-02)
// 응답의 token 을 프론트가 localStorage 'token' 으로 저장 (Login.tsx: res.data.token)
router.post('/login', async (req, res, next) => {
  try {
    const b = loginSchema.parse(req.body);
    // 아이디 또는 이메일로 로그인 (로그인 화면 문구에 맞춤)
    const [rows] = await pool.query(
      `SELECT user_number, user_id, password_hash, nickname, user_status
       FROM Users WHERE user_id = ? OR email = ? LIMIT 1`, [b.user_id, b.user_id.toLowerCase()]);
    const u = rows[0];
    // 아이디 없음/비밀번호 틀림은 같은 응답 (계정 존재 여부 노출 방지)
    if (!u || !(await bcrypt.compare(b.password, u.password_hash))) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
    if (u.user_status !== 'active') throw new ApiError(403, 'WITHDRAWN_USER', '탈퇴한 계정입니다.');

    const token = jwt.sign({ user_id: u.user_id }, process.env.JWT_SECRET, {
      subject: String(u.user_number),
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    const [[p]] = await pool.query('SELECT COUNT(*) AS c FROM Onboarding_profiles WHERE Users_user_number = ?', [u.user_number]);
    res.json({
      success: true,
      token,
      user: { user_number: u.user_number, user_id: u.user_id, nickname: u.nickname },
      onboarding_completed: p.c > 0, // 앱이 온보딩 화면으로 보낼지 판단
    });
  } catch (e) { next(e); }
});

module.exports = router;
