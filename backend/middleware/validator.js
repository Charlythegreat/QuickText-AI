/**
 * Request Validation Middleware (Free & Unlimited Version)
 * 
 * Validates incoming request data.
 * 
 * @module middleware/validator
 */

const aiService = require('../services/aiService');

/**
 * Validates generate request body
 * 
 * Checks:
 * - text: required, string, non-empty, max 10000 chars
 * - action: required, one of: rewrite, polite, professional, short
 * - language: optional, one of: en, fr, es, pt, hi (defaults to 'en')
 */
const validateGenerateRequest = (req, res, next) => {
  const { text, action, language } = req.body;
  const errors = [];
  
  // Validate text
  if (!text) {
    errors.push('Text is required');
  } else if (typeof text !== 'string') {
    errors.push('Text must be a string');
  } else if (text.trim().length === 0) {
    errors.push('Text cannot be empty');
  } else if (text.length > 10000) {
    errors.push('Text exceeds maximum length of 10000 characters');
  }
  
  // Validate action
  if (!action) {
    errors.push('Action is required');
  } else if (!aiService.isValidAction(action)) {
    errors.push(`Invalid action. Supported actions: rewrite, polite, professional, short`);
  }
  
  // Validate language (optional, defaults to 'en')
  if (language && !aiService.isValidLanguage(language)) {
    errors.push(`Invalid language. Supported languages: en, fr, es, pt, hi`);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors
      }
    });
  }
  
  // Normalize data
  req.body.text = text.trim();
  req.body.language = language || 'en';
  
  next();
};

module.exports = {
  validateGenerateRequest
};
