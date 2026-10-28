// 1. 라우터 파일 불러오기
const missionRouter = require('./routes/missions');
const pointRouter = require('./routes/points');

// (중략 - 기존 express 초기화 및 설정 코드들...)

// 2. API 주소 prefix와 함께 라우터 등록
app.use('/api/v1/missions', missionRouter);
app.use('/api/v1/points', pointRouter);