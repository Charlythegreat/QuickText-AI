/**
 * Rate Limiting Middleware (Free & Unlimited Version)
 * 
 * Provides simple rate limiting to prevent abuse.
 * Generous limits since this is a free service.
 * 
 * @module middleware/rateLimiter
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Key generator for rate limiting
 * Uses IP address for identification
 */
const keyGenerator = (req) => {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
};

/**
 * Handler when rate limit is exceeded
 */
const limitHandler = (req, res) => {
  logger.warn(`Rate limit exceeded for ${keyGenerator(req)}`);
  
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    }
  });
};

/**
 * Skip function - bypass rate limiting for certain requests
 */
const skipFunction = (req) => {
  // Skip health checks
  if (req.path === '/health') {
    return true;
  }
  
  return false;
};

/**
 * Global rate limiter (applies to all requests)
 * Generous limits for free service - prevents abuse only
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute by default
  max: config.rateLimit.maxRequests, // 30 requests per minute by default
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a moment and try again.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: limitHandler,
  skip: skipFunction
});

module.exports = {
  globalLimiter,
  keyGenerator,
  limitHandler
};
