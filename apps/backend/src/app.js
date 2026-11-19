require('dotenv').config();
const express = require('express');
const { errorHandler } = require('./errors');

const app = express();

// CORS: 프론트 개발 서버(http://localhost:5173 등)에서 호출할 수 있도록 허용
// CORS_ORIGIN 을 지정하면 그 주소만, 없으면 localhost / 127.0.0.1 의 모든 포트와
// 네이티브 앱 origin(iOS capacitor://localhost, Android https://localhost) 허용
const LOCAL_ORIGIN = /^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?|capacitor:\/\/localhost|https:\/\/localhost)$/;
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

app.use(express.json({ limit: '512kb' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/onboarding', require('./routes/onboarding'));
app.use('/api/v1/missions', require('./routes/missions'));
app.use('/api/v1/character', require('./routes/character'));
app.use('/api/v1/streak', require('./routes/streak'));
app.use('/api/v1/points', require('./routes/points'));
app.use('/api/v1/health', require('./routes/health'));
app.use('/api/v1/subscription', require('./routes/subscription'));
app.use('/api/v1/rewards', require('./routes/rewards'));
app.use((req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: '존재하지 않는 경로입니다.' }));
app.use(errorHandler);

module.exports = app;
