/**
 * LLM Service
 * 
 * Provider-agnostic LLM service with support for multiple providers.
 * Uses OpenAI-compatible API format for all providers.
 * 
 * Supported Providers:
 * - groq (default) - Groq API with Llama models
 * - openai - OpenAI API
 * - azure - Azure OpenAI
 * 
 * @module services/llm
 */

const config = require('../config');
const logger = require('../config/logger');
const { buildPrompt } = require('../config/prompts');

/**
 * Provider configurations with OpenAI-compatible endpoints
 */
const PROVIDERS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama3-70b-8192',
    getApiKey: () => config.llm.groq.apiKey,
    models: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it']
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    getApiKey: () => config.llm.openai.apiKey,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: config.llm.azure?.endpoint ? `${config.llm.azure.endpoint}/openai/deployments/${config.llm.azure.deployment}` : null,
    defaultModel: config.llm.azure?.deployment || 'gpt-4',
    getApiKey: () => config.llm.azure.apiKey,
    models: []
  }
};

/**
 * Gets the current provider configuration
 * 
 * @returns {Object} Provider configuration
 */
function getProvider() {
  const providerName = config.llm.provider || 'groq';
  const provider = PROVIDERS[providerName];
  
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerName}. Supported: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  
  return { ...provider, id: providerName };
}

/**
 * Gets the model to use based on configuration
 * 
 * @returns {string} Model name
 */
function getModel() {
  const provider = getProvider();
  
  // Check for provider-specific model configuration
  const providerConfig = config.llm[provider.id];
  
  if (providerConfig?.model) {
    return providerConfig.model;
  }
  
  return provider.defaultModel;
}

/**
 * Makes a chat completion request to the LLM provider
 * 
 * @param {Object} options - Request options
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userPrompt - User prompt
 * @param {number} [options.maxTokens] - Max tokens to generate
 * @param {number} [options.temperature] - Temperature for generation
 * @returns {Promise<string>} Generated text
 */
async function chatCompletion({ systemPrompt, userPrompt, maxTokens, temperature }) {
  const provider = getProvider();
  const model = getModel();
  const apiKey = provider.getApiKey();
  
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${provider.name}. Set ${provider.id.toUpperCase()}_API_KEY in environment.`);
  }
  
  const url = `${provider.baseUrl}/chat/completions`;
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: maxTokens || config.llm.maxTokens || 1024,
    temperature: temperature ?? config.llm.temperature ?? 0.7
  };
  
  logger.debug(`LLM Request to ${provider.name}`, {
    model,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length
  });
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      logger.error(`LLM API Error from ${provider.name}:`, {
        status: response.status,
        error: errorMessage
      });
      
      throw new Error(`LLM API Error: ${errorMessage}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    logger.info(`LLM Response from ${provider.name}`, {
      model,
      duration: `${duration}ms`,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens
    });
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in LLM response');
    }
    
    return content.trim();
    
  } catch (error) {
    if (error.message.includes('LLM API Error')) {
      throw error;
    }
    
    logger.error(`LLM Request failed:`, error);
    throw new Error(`Failed to connect to ${provider.name}: ${error.message}`);
  }
}

/**
 * Generates text based on action and input
 * 
 * @param {Object} options - Generation options
 * @param {string} options.text - Input text
 * @param {string} options.action - Action type (rewrite, polite, professional, short)
 * @param {string} [options.language='en'] - Output language
 * @returns {Promise<Object>} Generation result
 */
async function generate({ text, action, language = 'en' }) {
  const startTime = Date.now();
  
  // Build prompts
  const { systemPrompt, userPrompt, action: actionName, language: languageName } = buildPrompt(action, text, language);
  
  logger.info(`Generating ${actionName} in ${languageName}`, {
    textLength: text.length,
    action,
    language
  });
  
  // Call LLM
  const result = await chatCompletion({
    systemPrompt,
    userPrompt
  });
  
  const duration = Date.now() - startTime;
  
  return {
    result,
    metadata: {
      action: actionName,
      language: languageName,
      provider: getProvider().name,
      model: getModel(),
      duration,
      inputLength: text.length,
      outputLength: result.length
    }
  };
}

/**
 * Gets information about the current LLM configuration
 * 
 * @returns {Object} LLM info
 */
function getInfo() {
  const provider = getProvider();
  
  return {
    provider: provider.name,
    providerId: provider.id,
    model: getModel(),
    availableModels: provider.models,
    configured: !!provider.getApiKey()
  };
}

/**
 * Tests the LLM connection
 * 
 * @returns {Promise<Object>} Test result
 */
async function testConnection() {
  try {
    const result = await chatCompletion({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say "OK" and nothing else.',
      maxTokens: 10
    });
    
    return {
      success: true,
      provider: getProvider().name,
      model: getModel(),
      response: result
    };
  } catch (error) {
    return {
      success: false,
      provider: getProvider().name,
      model: getModel(),
      error: error.message
    };
  }
}

module.exports = {
  generate,
  chatCompletion,
  getProvider,
  getModel,
  getInfo,
  testConnection,
  PROVIDERS
};
