require('dotenv').config();
const express = require('express');
const { errorHandler } = require('./errors');

// 1. 라우터 파일 불러오기
const missionRouter = require('./routes/missions');
const pointRouter = require('./routes/points');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/v1/auth', require('./routes/auth') || ((req, res) => res.status(404).json({ message: 'Auth route not found' })));
app.use('/api/v1/onboarding', require('./routes/onboarding') || ((req, res) => res.status(404).json({ message: 'Onboarding route not found' })));

// 2. API 주소 prefix와 함께 라우터 등록
app.use('/api/v1/missions', missionRouter);
app.use('/api/v1/points', pointRouter);

// 3. 404 에러 및 전역 에러 핸들러
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '존재하지 않는 경로입니다.' } }));
app.use(errorHandler);

module.exports = app;
