const config = require('../config');
const logger = require('../utils/logger');

function adminAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Admin request without API key');
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  if (apiKey !== config.admin.apiKey) {
    logger.warn('Admin request with invalid API key');
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
}

module.exports = adminAuth;
