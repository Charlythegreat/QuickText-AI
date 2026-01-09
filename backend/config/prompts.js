/**
 * Language-Aware Prompt Templates
 * 
 * Templates for different actions with language-specific system prompts.
 * 
 * @module config/prompts
 */

/**
 * Supported languages with their configurations
 */
const LANGUAGES = {
  en: {
    name: 'English',
    instruction: 'Respond in English.'
  },
  fr: {
    name: 'French',
    instruction: 'Répondez en français.'
  },
  es: {
    name: 'Spanish',
    instruction: 'Responde en español.'
  },
  pt: {
    name: 'Portuguese',
    instruction: 'Responda em português.'
  },
  hi: {
    name: 'Hindi',
    instruction: 'हिंदी में जवाब दें।'
  }
};

/**
 * Action types with their prompts
 */
const ACTIONS = {
  rewrite: {
    name: 'Rewrite',
    systemPrompt: `You are a professional writing assistant. Your task is to rewrite the given text to improve clarity, flow, and readability while preserving the original meaning and intent.

Guidelines:
- Maintain the same tone and formality level
- Fix any grammar or spelling errors
- Improve sentence structure and word choice
- Keep the same approximate length
- Do not add new information

Respond only with the rewritten text, no explanations.`,
    userPromptTemplate: 'Rewrite the following text:\n\n{text}'
  },
  
  polite: {
    name: 'Polite Reply',
    systemPrompt: `You are a professional communication assistant. Your task is to help draft polite, friendly, and professional responses to messages.

Guidelines:
- Be warm and courteous
- Show empathy and understanding
- Use appropriate greetings and closings
- Keep the response focused and helpful
- Match the formality level of the original message

Respond only with the polite reply, no explanations.`,
    userPromptTemplate: 'Write a polite reply to the following message:\n\n{text}'
  },
  
  professional: {
    name: 'Professional',
    systemPrompt: `You are a business communication expert. Your task is to transform or respond to the given text in a professional, formal business style.

Guidelines:
- Use formal business language
- Be clear, concise, and direct
- Maintain a respectful and professional tone
- Avoid slang, contractions, and casual expressions
- Structure the response appropriately for business context

Respond only with the professional text, no explanations.`,
    userPromptTemplate: 'Transform the following into professional business language:\n\n{text}'
  },
  
  short: {
    name: 'Short Reply',
    systemPrompt: `You are a concise communication assistant. Your task is to create brief, to-the-point responses that convey the essential message efficiently.

Guidelines:
- Be extremely concise (1-3 sentences max)
- Capture the key point or response
- Maintain politeness despite brevity
- Remove all unnecessary words
- Keep the core meaning intact

Respond only with the short reply, no explanations.`,
    userPromptTemplate: 'Write a short, concise reply to the following:\n\n{text}'
  }
};

/**
 * Builds a complete prompt for the LLM
 * 
 * @param {string} action - Action type (rewrite, polite, professional, short)
 * @param {string} text - Input text from user
 * @param {string} language - Language code (en, fr, es, pt, hi)
 * @returns {Object} Object with system and user prompts
 */
function buildPrompt(action, text, language = 'en') {
  const actionConfig = ACTIONS[action];
  const languageConfig = LANGUAGES[language] || LANGUAGES.en;
  
  if (!actionConfig) {
    throw new Error(`Unknown action: ${action}`);
  }
  
  // Build system prompt with language instruction
  const systemPrompt = `${actionConfig.systemPrompt}\n\nIMPORTANT: ${languageConfig.instruction}`;
  
  // Build user prompt with the text
  const userPrompt = actionConfig.userPromptTemplate.replace('{text}', text);
  
  return {
    systemPrompt,
    userPrompt,
    action: actionConfig.name,
    language: languageConfig.name
  };
}

/**
 * Validates if an action is supported
 * 
 * @param {string} action - Action type to validate
 * @returns {boolean} True if action is supported
 */
function isValidAction(action) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, action);
}

/**
 * Validates if a language is supported
 * 
 * @param {string} language - Language code to validate
 * @returns {boolean} True if language is supported
 */
function isValidLanguage(language) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, language);
}

/**
 * Gets list of supported actions
 * 
 * @returns {string[]} Array of action names
 */
function getSupportedActions() {
  return Object.keys(ACTIONS);
}

/**
 * Gets list of supported languages
 * 
 * @returns {string[]} Array of language codes
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGES);
}

module.exports = {
  LANGUAGES,
  ACTIONS,
  buildPrompt,
  isValidAction,
  isValidLanguage,
  getSupportedActions,
  getSupportedLanguages
};
