/**
 * API Routes Index (Free & Unlimited Version)
 * 
 * Combines all API routes under /api/v1
 * 
 * Route structure:
 * - /api/v1/generate - AI text generation (no auth required)
 * 
 * @module routes
 */

const express = require('express');
const router = express.Router();

const generateRoutes = require('./generate');
const { globalLimiter } = require('../middleware/rateLimiter');

// Apply global rate limiter to all routes
router.use(globalLimiter);

// Mount routes
router.use('/generate', generateRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'QuickText AI API',
      version: 'v1',
      description: 'Free & Unlimited AI text generation',
      endpoints: {
        generate: {
          method: 'POST',
          path: '/api/v1/generate',
          description: 'Generate AI text based on action'
        },
        info: {
          method: 'GET',
          path: '/api/v1/generate/info',
          description: 'Get LLM provider information'
        }
      }
    }
  });
});

module.exports = router;
