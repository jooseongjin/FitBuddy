require('dotenv').config();
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET 환경변수가 필요합니다 (.env)'); process.exit(1); }
const app = require('./app');
// 프론트(apps/frontend/src/api/axios.ts)의 baseURL 이 http://localhost:4000/api/v1
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`FitBuddy API listening on :${port}`));
