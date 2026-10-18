const jwt = require('jsonwebtoken');
const { ApiError } = require('../errors');

// Authorization: Bearer <token> 검증 → req.user = { userNumber, userId }
module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.'));
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userNumber: p.sub, userId: p.userId };
    next();
  } catch (e) {
    next(new ApiError(401, 'INVALID_TOKEN', '토큰이 없거나 만료되었습니다.'));
  }
};
