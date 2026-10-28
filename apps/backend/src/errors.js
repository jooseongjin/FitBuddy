// 전역 에러 핸들러 미들웨어
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: err.message || '서버 내부 오류가 발생했습니다.'
        }
    });
};

module.exports = { errorHandler };
