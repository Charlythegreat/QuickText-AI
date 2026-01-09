/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the API.
 * 
 * @module middleware/errorHandler
 */

const logger = require('../config/logger');
const config = require('../config');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler - 404
 */
const notFoundHandler = (req, res, next) => {
  const error = new APIError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  
  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      code,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn('Client Error:', {
      message: err.message,
      code,
      path: req.path,
      method: req.method
    });
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  }
  
  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  
  // Don't leak error details in production
  if (config.env === 'production' && statusCode >= 500) {
    message = 'An unexpected error occurred';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(config.env === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  APIError,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
