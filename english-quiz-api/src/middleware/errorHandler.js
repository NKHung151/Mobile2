const logger = require('../utils/logger');

class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
}

function errorHandler(err, req, res, next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    errName: err.name,
    errCode: err.code,
  });

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    const message = process.env.NODE_ENV === 'production'
      ? 'Validation error'
      : `Validation error: ${Object.values(err.errors).map(e => e.message).join(', ')}`;

    return res.status(400).json({
      success: false,
      error: message,
      details: details
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }

  if (err.response?.status === 429) {
    return res.status(502).json({
      success: false,
      error: 'AI service rate limit exceeded. Please try again later.'
    });
  }

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message
  });
}

module.exports = {
  APIError,
  errorHandler,
  notFoundHandler
};
