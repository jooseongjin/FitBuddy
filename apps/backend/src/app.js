require('dotenv').config();
const express = require('express');
const { errorHandler } = require('./errors');

const app = express();

// CORS: 프론트 개발 서버(http://localhost:5173 등)에서 호출할 수 있도록 허용
// CORS_ORIGIN 을 지정하면 그 주소만, 없으면 localhost / 127.0.0.1 의 모든 포트 허용
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).includes(origin)
    : LOCAL_ORIGIN.test(origin || '');
  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/onboarding', require('./routes/onboarding'));
// 미션·포인트 API(박상욱 담당)는 해당 PR에서 아래처럼 등록
// app.use('/api/v1/missions', require('./routes/missions'));
// app.use('/api/v1/points', require('./routes/points'));
app.use((req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: '존재하지 않는 경로입니다.' }));
app.use(errorHandler);

module.exports = app;
