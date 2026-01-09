/**
 * QuickText AI - Configuration (Free & Unlimited Version)
 * 
 * Centralized configuration for the browser extension.
 * 
 * @module config
 */

// =============================================================================
// Default Configuration
// =============================================================================

const CONFIG = {
  // API Configuration
  api: {
    // Production URL - change this for deployment
    baseUrl: 'http://localhost:3000/api/v1',
    
    // Request timeout in milliseconds
    timeout: 30000,
    
    // Retry configuration
    maxRetries: 2,
    retryDelay: 1000
  },
  
  // Character limit (generous for free version)
  maxChars: 10000,
  
  // UI Configuration
  ui: {
    toastDuration: 3000,
    animationDuration: 200
  },
  
  // Supported Languages
  languages: ['en', 'fr', 'es', 'pt', 'hi'],
  
  // Default Language
  defaultLanguage: 'en',
  
  // Debug Mode
  debug: true
};

// =============================================================================
// Storage Keys
// =============================================================================

const StorageKeys = {
  // API Config
  API_BASE_URL: 'qt_api_base_url',
  
  // Preferences
  LANGUAGE: 'qt_language',
  
  // Selected Text (from context menu)
  SELECTED_TEXT: 'qt_selected_text'
};

// =============================================================================
// Configuration Helpers
// =============================================================================

/**
 * Gets a configuration value
 * 
 * @param {string} key - Configuration key (dot notation)
 * @returns {any} Configuration value
 */
function getConfig(key) {
  const keys = key.split('.');
  let value = CONFIG;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Gets the character limit
 * 
 * @returns {number} Character limit
 */
function getCharLimit() {
  return CONFIG.maxChars;
}

/**
 * Checks if debug mode is enabled
 * 
 * @returns {boolean} True if debug mode is on
 */
function isDebugMode() {
  return CONFIG.debug;
}

/**
 * Logs a debug message if debug mode is enabled
 * 
 * @param  {...any} args - Arguments to log
 */
function debugLog(...args) {
  if (CONFIG.debug) {
    console.log('[QuickText]', ...args);
  }
}

// =============================================================================
// Export
// =============================================================================

window.config = {
  CONFIG,
  StorageKeys,
  getConfig,
  getCharLimit,
  isDebugMode,
  debugLog
};
