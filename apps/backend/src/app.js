require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./errors');

const missionRouter = require('./routes/missions');
const pointRouter = require('./routes/points');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/onboarding', require('./routes/onboarding'));

app.use('/api/v1/missions', missionRouter);
app.use('/api/v1/points', pointRouter);

app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '존재하지 않는 경로입니다.' } }));
app.use(errorHandler);

module.exports = app;
