class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
// 공통 에러 응답: { error: { code, message } }
function errorHandler(err, req, res, next) { // eslint-disable-line
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
    });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON 형식이 올바르지 않습니다.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
}
module.exports = { ApiError, errorHandler };
