/**
 * AI Service
 * 
 * High-level AI text generation service with optimized multilingual prompts.
 * Orchestrates LLM calls with language-aware prompt engineering.
 * 
 * @module services/aiService
 */

const llm = require('./llm');
const logger = require('../config/logger');

// =============================================================================
// Language Configurations
// =============================================================================

/**
 * Comprehensive language configurations with native instructions
 * and cultural nuances for each supported language.
 */
const LANGUAGE_CONFIG = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    // Core instruction in target language
    outputInstruction: 'Write your response entirely in English.',
    // Greeting/closing conventions
    greetings: ['Hello', 'Hi', 'Dear', 'Good morning', 'Good afternoon'],
    closings: ['Best regards', 'Sincerely', 'Thank you', 'Kind regards', 'Best'],
    // Cultural tone guidance
    toneGuidance: 'Use clear, direct communication. Be friendly but professional.',
    // Formality markers
    formalMarkers: ['Dear', 'Sincerely', 'I would like to', 'Please be advised'],
    informalMarkers: ['Hey', 'Thanks!', 'Cheers', 'No worries']
  },
  
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    outputInstruction: 'Rédigez votre réponse entièrement en français.',
    greetings: ['Bonjour', 'Cher/Chère', 'Madame, Monsieur', 'Bonsoir'],
    closings: ['Cordialement', 'Bien à vous', 'Sincères salutations', 'Avec mes meilleures salutations'],
    toneGuidance: 'Utilisez le vouvoiement pour le registre formel. Soyez poli et respectueux des conventions françaises.',
    formalMarkers: ['Veuillez', 'Je vous prie de', 'Madame, Monsieur', 'Cordialement'],
    informalMarkers: ['Salut', 'Bisous', 'À plus', 'Ciao']
  },
  
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    outputInstruction: 'Escribe tu respuesta completamente en español.',
    greetings: ['Hola', 'Buenos días', 'Buenas tardes', 'Estimado/a', 'Querido/a'],
    closings: ['Saludos cordiales', 'Atentamente', 'Un abrazo', 'Gracias', 'Saludos'],
    toneGuidance: 'Use usted para contextos formales y tú para informales. Sea cálido pero respetuoso.',
    formalMarkers: ['Estimado/a', 'Le saluda atentamente', 'Quedamos a su disposición'],
    informalMarkers: ['¡Hola!', '¡Genial!', 'Besos', 'Cuídate']
  },
  
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    outputInstruction: 'Escreva sua resposta inteiramente em português.',
    greetings: ['Olá', 'Bom dia', 'Boa tarde', 'Prezado/a', 'Caro/a'],
    closings: ['Atenciosamente', 'Cordialmente', 'Abraços', 'Obrigado/a', 'Saudações'],
    toneGuidance: 'Use você em contextos neutros e o senhor/a senhora para formalidade. Seja cordial.',
    formalMarkers: ['Prezado/a', 'Vossa Senhoria', 'Atenciosamente', 'Ficamos à disposição'],
    informalMarkers: ['Oi', 'Tudo bem?', 'Beijos', 'Falou']
  },
  
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    outputInstruction: 'अपना जवाब पूरी तरह से हिंदी में लिखें।',
    greetings: ['नमस्ते', 'प्रिय', 'आदरणीय', 'सुप्रभात'],
    closings: ['धन्यवाद', 'शुभकामनाएं', 'सादर', 'आपका शुभचिंतक'],
    toneGuidance: 'आप का प्रयोग करें औपचारिक संदर्भों में। सम्मानजनक और विनम्र रहें।',
    formalMarkers: ['आदरणीय', 'कृपया', 'सादर प्रणाम', 'महोदय/महोदया'],
    informalMarkers: ['अरे', 'क्या हाल है', 'बाय', 'मिलते हैं']
  }
};

// =============================================================================
// Action Configurations with Optimized Prompts
// =============================================================================

/**
 * Action-specific prompt templates optimized for each style.
 * Each action has language-specific variations for better results.
 */
const ACTION_PROMPTS = {
  rewrite: {
    name: 'Rewrite',
    description: 'Improve clarity and readability',
    
    /**
     * Generates system prompt for rewrite action
     * @param {Object} langConfig - Language configuration
     * @returns {string} System prompt
     */
    getSystemPrompt: (langConfig) => `You are an expert ${langConfig.name} language editor and writing assistant.

YOUR TASK: Rewrite the given text to improve clarity, flow, and readability while preserving the original meaning.

RULES:
1. ${langConfig.outputInstruction}
2. Maintain the same tone and formality level as the original
3. Fix all grammar, spelling, and punctuation errors
4. Improve sentence structure and word choice
5. Keep approximately the same length
6. Do NOT add new information or opinions
7. Do NOT include any explanations or notes
8. Output ONLY the rewritten text

${langConfig.toneGuidance}`,

    /**
     * Generates user prompt for rewrite action
     * @param {string} text - Input text
     * @param {Object} langConfig - Language configuration
     * @returns {string} User prompt
     */
    getUserPrompt: (text, langConfig) => 
      `Rewrite this text in ${langConfig.name}:\n\n${text}`
  },

  polite: {
    name: 'Polite Reply',
    description: 'Generate a polite, friendly response',
    
    getSystemPrompt: (langConfig) => `You are a warm, empathetic communication assistant fluent in ${langConfig.name}.

YOUR TASK: Write a polite, friendly, and helpful reply to the given message.

RULES:
1. ${langConfig.outputInstruction}
2. Be warm, courteous, and show genuine empathy
3. Use appropriate greetings (e.g., ${langConfig.greetings.slice(0, 3).join(', ')})
4. Use appropriate closings (e.g., ${langConfig.closings.slice(0, 3).join(', ')})
5. Address the person's concerns or questions directly
6. Keep the response focused and helpful
7. Match the formality level of the original message
8. Do NOT include explanations about what you're doing
9. Output ONLY the polite reply

${langConfig.toneGuidance}`,

    getUserPrompt: (text, langConfig) => 
      `Write a polite ${langConfig.name} reply to this message:\n\n${text}`
  },

  professional: {
    name: 'Professional',
    description: 'Transform into formal business language',
    
    getSystemPrompt: (langConfig) => `You are an expert business communication specialist fluent in formal ${langConfig.name}.

YOUR TASK: Transform the given text into professional, formal business language.

RULES:
1. ${langConfig.outputInstruction}
2. Use formal business vocabulary and structure
3. Be clear, concise, and direct
4. Maintain a respectful, professional tone throughout
5. Avoid slang, contractions, and casual expressions
6. Use formal markers where appropriate (e.g., ${langConfig.formalMarkers.slice(0, 2).join(', ')})
7. Structure appropriately for business context
8. Do NOT include explanations or meta-commentary
9. Output ONLY the professional text

${langConfig.toneGuidance}`,

    getUserPrompt: (text, langConfig) => 
      `Transform this into formal ${langConfig.name} business language:\n\n${text}`
  },

  short: {
    name: 'Short Reply',
    description: 'Create a brief, concise response',
    
    getSystemPrompt: (langConfig) => `You are a master of concise communication in ${langConfig.name}.

YOUR TASK: Create an extremely brief, to-the-point response that captures the essential message.

RULES:
1. ${langConfig.outputInstruction}
2. Use 1-3 sentences MAXIMUM
3. Capture only the key point or response
4. Remove ALL unnecessary words and filler
5. Maintain basic politeness despite brevity
6. Keep the core meaning intact
7. Do NOT include greetings or closings unless essential
8. Do NOT explain what you're doing
9. Output ONLY the short reply

BREVITY IS KEY. Every word must count.`,

    getUserPrompt: (text, langConfig) => 
      `Write a very short ${langConfig.name} reply (1-3 sentences max):\n\n${text}`
  }
};

// =============================================================================
// AI Service Functions
// =============================================================================

/**
 * Validates language code
 * 
 * @param {string} language - Language code to validate
 * @returns {boolean} True if valid
 */
function isValidLanguage(language) {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_CONFIG, language);
}

/**
 * Validates action type
 * 
 * @param {string} action - Action type to validate
 * @returns {boolean} True if valid
 */
function isValidAction(action) {
  return Object.prototype.hasOwnProperty.call(ACTION_PROMPTS, action);
}

/**
 * Gets supported languages
 * 
 * @returns {Object[]} Array of language info objects
 */
function getSupportedLanguages() {
  return Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
    code,
    name: config.name,
    nativeName: config.nativeName
  }));
}

/**
 * Gets supported actions
 * 
 * @returns {Object[]} Array of action info objects
 */
function getSupportedActions() {
  return Object.entries(ACTION_PROMPTS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description
  }));
}

/**
 * Builds optimized prompts for the given action and language
 * 
 * @param {string} action - Action type (rewrite, polite, professional, short)
 * @param {string} text - Input text
 * @param {string} language - Language code (en, fr, es, pt, hi)
 * @returns {Object} Object with systemPrompt and userPrompt
 */
function buildOptimizedPrompt(action, text, language = 'en') {
  // Validate inputs
  if (!isValidAction(action)) {
    throw new Error(`Invalid action: ${action}. Supported: ${Object.keys(ACTION_PROMPTS).join(', ')}`);
  }
  
  if (!isValidLanguage(language)) {
    logger.warn(`Unknown language: ${language}, falling back to English`);
    language = 'en';
  }
  
  const langConfig = LANGUAGE_CONFIG[language];
  const actionConfig = ACTION_PROMPTS[action];
  
  const systemPrompt = actionConfig.getSystemPrompt(langConfig);
  const userPrompt = actionConfig.getUserPrompt(text, langConfig);
  
  return {
    systemPrompt,
    userPrompt,
    action: actionConfig.name,
    language: langConfig.name,
    languageCode: language
  };
}

/**
 * Generates AI-powered text transformation
 * 
 * @param {Object} options - Generation options
 * @param {string} options.text - Input text to transform
 * @param {string} options.action - Action type (rewrite, polite, professional, short)
 * @param {string} [options.language='en'] - Output language code
 * @returns {Promise<Object>} Generation result with text and metadata
 */
async function generateText({ text, action, language = 'en' }) {
  const startTime = Date.now();
  
  // Validate inputs
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required and must be a non-empty string');
  }
  
  if (!isValidAction(action)) {
    throw new Error(`Invalid action: ${action}`);
  }
  
  // Build optimized prompts
  const prompts = buildOptimizedPrompt(action, text.trim(), language);
  
  logger.info(`AI Generation: ${prompts.action} in ${prompts.language}`, {
    inputLength: text.length,
    action,
    language
  });
  
  try {
    // Call LLM service
    const response = await llm.chatCompletion({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt
    });
    
    const duration = Date.now() - startTime;
    
    // Get LLM info for metadata
    const llmInfo = llm.getInfo();
    
    logger.info(`AI Generation complete`, {
      action,
      language,
      duration: `${duration}ms`,
      outputLength: response.length
    });
    
    return {
      success: true,
      result: response,
      metadata: {
        action: prompts.action,
        language: prompts.language,
        languageCode: prompts.languageCode,
        provider: llmInfo.provider,
        model: llmInfo.model,
        duration,
        inputLength: text.length,
        outputLength: response.length,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`AI Generation failed`, {
      action,
      language,
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Batch generate multiple transformations for the same text
 * Useful for showing multiple options to the user
 * 
 * @param {Object} options - Generation options
 * @param {string} options.text - Input text
 * @param {string[]} options.actions - Array of action types
 * @param {string} [options.language='en'] - Output language
 * @returns {Promise<Object>} Results for each action
 */
async function batchGenerate({ text, actions, language = 'en' }) {
  const results = {};
  const errors = {};
  
  // Run generations in parallel
  const promises = actions.map(async (action) => {
    try {
      const result = await generateText({ text, action, language });
      results[action] = result;
    } catch (error) {
      errors[action] = error.message;
    }
  });
  
  await Promise.all(promises);
  
  return {
    results,
    errors,
    hasErrors: Object.keys(errors).length > 0
  };
}

/**
 * Detect the language of input text (basic detection)
 * For production, consider using a proper language detection library
 * 
 * @param {string} text - Text to analyze
 * @returns {string} Detected language code or 'en' as fallback
 */
function detectLanguage(text) {
  // Simple heuristic based on character sets and common words
  const sample = text.toLowerCase().substring(0, 500);
  
  // Hindi - Devanagari script detection
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }
  
  // French indicators
  const frenchWords = ['je', 'vous', 'nous', 'est', 'sont', 'les', 'une', 'des', 'que', 'qui', 'avec', 'pour', 'dans', 'sur'];
  const frenchCount = frenchWords.filter(word => sample.includes(` ${word} `) || sample.startsWith(`${word} `)).length;
  
  // Spanish indicators
  const spanishWords = ['que', 'los', 'las', 'una', 'con', 'por', 'para', 'como', 'pero', 'más', 'esta', 'esto'];
  const spanishCount = spanishWords.filter(word => sample.includes(` ${word} `) || sample.startsWith(`${word} `)).length;
  
  // Portuguese indicators
  const portugueseWords = ['que', 'não', 'uma', 'com', 'para', 'como', 'mas', 'você', 'isso', 'está', 'muito'];
  const portugueseCount = portugueseWords.filter(word => sample.includes(` ${word} `) || sample.startsWith(`${word} `)).length;
  
  // Check for accented characters common in specific languages
  const hasPortugueseAccents = /[ãõç]/.test(sample);
  const hasSpanishAccents = /[ñ¿¡]/.test(sample);
  const hasFrenchAccents = /[àâçéèêëîïôùûü]/.test(sample);
  
  if (hasPortugueseAccents && portugueseCount >= 2) return 'pt';
  if (hasSpanishAccents || spanishCount >= 3) return 'es';
  if (hasFrenchAccents || frenchCount >= 3) return 'fr';
  if (portugueseCount >= 3) return 'pt';
  
  // Default to English
  return 'en';
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Main functions
  generateText,
  batchGenerate,
  buildOptimizedPrompt,
  detectLanguage,
  
  // Validation
  isValidAction,
  isValidLanguage,
  
  // Info
  getSupportedLanguages,
  getSupportedActions,
  
  // Configurations (for testing/debugging)
  LANGUAGE_CONFIG,
  ACTION_PROMPTS
};
