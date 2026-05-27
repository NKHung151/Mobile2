const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware xác thực JSON Web Token (JWT) gửi kèm trong request header.
 * Lấy Bearer token từ header 'Authorization', giải mã và kiểm tra tính hợp lệ.
 * Nếu hợp lệ, gán payload (userId, username, email) vào đối tượng req.user và tiếp tục.
 * Nếu không hợp lệ hoặc thiếu token, trả về phản hồi lỗi HTTP 401 Unauthorized.
 * 
 * @param {Object} req - Express Request object, cần có headers.authorization
 * @param {Object} res - Express Response object, dùng để trả về lỗi 401
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Trả về response JSON lỗi hoặc gọi next()
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

module.exports = {
  authenticateToken,
};
