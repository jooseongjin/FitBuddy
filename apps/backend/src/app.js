require('dotenv').config();
const express = require('express');
const { errorHandler } = require('./errors');

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/onboarding', require('./routes/onboarding'));
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '존재하지 않는 경로입니다.' } }));
app.use(errorHandler);
module.exports = app;
