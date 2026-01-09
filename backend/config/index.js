/**
 * Application Configuration (Free & Unlimited Version)
 * 
 * Centralized configuration loaded from environment variables.
 * 
 * @module config
 */

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  
  // CORS - Allow all origins for free version
  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['*']
  },
  
  // LLM Configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'groq',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 1024,
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    
    // Groq (default - recommended for free tier)
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama3-70b-8192'
    },
    
    // OpenAI (alternative)
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    
    // Azure OpenAI (alternative)
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT
    }
  },
  
  // Rate Limiting (generous for free version)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 30
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

// Validation
function validateConfig() {
  const errors = [];
  
  if (config.env === 'production') {
    // Check for at least one LLM provider configured
    const hasGroq = !!config.llm.groq.apiKey;
    const hasOpenAI = !!config.llm.openai.apiKey;
    const hasAzure = !!config.llm.azure.apiKey;
    
    if (!hasGroq && !hasOpenAI && !hasAzure) {
      errors.push('At least one LLM API key is required (GROQ_API_KEY, OPENAI_API_KEY, or AZURE_OPENAI_API_KEY)');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

// Validate on load (skip in test environment)
if (config.env !== 'test') {
  try {
    validateConfig();
  } catch (error) {
    console.error(error.message);
    if (config.env === 'production') {
      process.exit(1);
    }
  }
}

module.exports = config;
