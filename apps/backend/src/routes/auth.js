const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { ApiError } = require('../errors');

const router = express.Router();

const signupSchema = z.object({
  userId: z.string().regex(/^[A-Za-z0-9_]{4,30}$/, '아이디는 영문/숫자/_ 4~30자'),
  password: z.string().min(8, '비밀번호는 8자 이상').max(64).regex(/[A-Za-z]/, '영문 포함').regex(/[0-9]/, '숫자 포함'),
  email: z.string().email('이메일 형식이 올바르지 않습니다').max(255),
  nickname: z.string().min(2).max(16),
});
const loginSchema = z.object({ userId: z.string().min(1), password: z.string().min(1) });

// POST /api/v1/auth/signup
// Users + Streaks + Characters 를 한 트랜잭션으로 생성 (이후 기능이 행 존재를 가정할 수 있게)
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
        [b.userId, hash, b.email.toLowerCase(), b.nickname]
      );
      userNumber = r.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        const field = /uq_users_email/.test(e.message) ? 'email' : 'userId';
        throw new ApiError(409, field === 'email' ? 'EMAIL_TAKEN' : 'USER_ID_TAKEN',
          field === 'email' ? '이미 사용 중인 이메일입니다.' : '이미 사용 중인 아이디입니다.');
      }
      throw e;
    }
    await conn.query('INSERT INTO Streaks (Users_user_number) VALUES (?)', [userNumber]);
    await conn.query('INSERT INTO `Characters` (Users_user_number) VALUES (?)', [userNumber]);
    await conn.commit();
    res.status(201).json({ userNumber, userId: b.userId, nickname: b.nickname });
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const b = loginSchema.parse(req.body);
    const [rows] = await pool.query(
      'SELECT user_number, user_id, password_hash, nickname, user_status FROM Users WHERE user_id = ?', [b.userId]);
    const u = rows[0];
    // 아이디 없음/비번 틀림/탈퇴 모두 같은 응답 (계정 존재 여부 노출 방지)
    const ok = u && u.user_status === 'active' && (await bcrypt.compare(b.password, u.password_hash));
    if (!ok) throw new ApiError(401, 'INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다.');

    const accessToken = jwt.sign({ userId: u.user_id }, process.env.JWT_SECRET, {
      subject: String(u.user_number),
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    const [[p]] = await pool.query('SELECT COUNT(*) AS c FROM Onboarding_profiles WHERE Users_user_number = ?', [u.user_number]);
    res.json({
      accessToken,
      tokenType: 'Bearer',
      user: { userNumber: u.user_number, userId: u.user_id, nickname: u.nickname },
      onboardingCompleted: p.c > 0, // 앱이 온보딩 화면으로 보낼지 판단
    });
  } catch (e) { next(e); }
});

module.exports = router;
