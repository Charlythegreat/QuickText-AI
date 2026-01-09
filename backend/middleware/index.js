/**
 * Middleware Index (Free & Unlimited Version)
 * 
 * Exports all middleware modules.
 * 
 * @module middleware
 */

const rateLimiter = require('./rateLimiter');
const errorHandler = require('./errorHandler');
const validator = require('./validator');

module.exports = {
  ...rateLimiter,
  ...errorHandler,
  ...validator
};
