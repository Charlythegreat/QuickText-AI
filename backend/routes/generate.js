/**
 * Generate Routes (Free & Unlimited Version)
 * 
 * Handles AI text generation endpoints.
 * No authentication or quota checking - fully free!
 * 
 * @module routes/generate
 */

const express = require('express');
const router = express.Router();

const { validateGenerateRequest } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/aiService');
const logger = require('../config/logger');

/**
 * POST /api/v1/generate
 * 
 * Generate AI text based on action type.
 * Free and unlimited - no authentication required!
 * 
 * Request Body:
 * - text (string, required): Input text to process
 * - action (string, required): Action type (rewrite, polite, professional, short)
 * - language (string, optional): Output language code (en, fr, es, pt, hi)
 * 
 * Response:
 * - success: boolean
 * - data.result: Generated text
 * - data.metadata: Generation metadata
 */
router.post(
  '/',
  validateGenerateRequest,
  asyncHandler(async (req, res) => {
    const { text, action, language } = req.body;
    
    logger.info('Generate request', {
      action,
      language,
      textLength: text.length
    });
    
    try {
      const { success, result, metadata } = await aiService.generateText({
        text,
        action,
        language
      });
      
      res.json({
        success: true,
        data: {
          result,
          metadata: {
            action: metadata.action,
            language: metadata.language,
            languageCode: metadata.languageCode,
            provider: metadata.provider,
            model: metadata.model,
            processingTime: metadata.duration
          }
        }
      });
      
    } catch (error) {
      logger.error('Generation failed:', error);
      
      // Return appropriate error based on type
      if (error.message.includes('API key not configured')) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI service is not configured. Please contact support.'
          }
        });
      }
      
      if (error.message.includes('LLM API Error')) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'LLM_ERROR',
            message: 'AI service returned an error. Please try again.'
          }
        });
      }
      
      throw error;
    }
  })
);

/**
 * GET /api/v1/generate/info
 * 
 * Get information about the current LLM configuration.
 * Useful for debugging and status checks.
 */
router.get('/info', (req, res) => {
  const llmService = require('../services/llm');
  const info = llmService.getInfo();
  
  res.json({
    success: true,
    data: {
      provider: info.provider,
      model: info.model,
      configured: info.configured,
      supportedActions: aiService.getSupportedActions(),
      supportedLanguages: aiService.getSupportedLanguages(),
      plan: 'free-unlimited'
    }
  });
});

/**
 * GET /api/v1/generate/test
 * 
 * Test LLM connection (development only).
 */
router.get(
  '/test',
  asyncHandler(async (req, res) => {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    }
    
    const llmService = require('../services/llm');
    const result = await llmService.testConnection();
    
    res.json({
      success: result.success,
      data: result
    });
  })
);

module.exports = router;
