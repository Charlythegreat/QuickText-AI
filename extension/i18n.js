/**
 * QuickText AI - Internationalization (i18n) Module
 * 
 * This module handles all translation-related functionality:
 * - Loading translation files
 * - Detecting browser language
 * - Managing language preferences via chrome.storage.sync
 * - Dynamically updating UI labels
 */

// Supported languages with their codes
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'hi'];
const DEFAULT_LANGUAGE = 'en';

// Cache for loaded translations
let translationsCache = {};
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Detects the browser's preferred language
 * Falls back to DEFAULT_LANGUAGE if browser language is not supported
 * 
 * @returns {string} The detected language code (e.g., 'en', 'fr')
 */
function detectBrowserLanguage() {
  // Get browser language (e.g., 'en-US', 'fr-FR')
  const browserLang = navigator.language || navigator.userLanguage;
  
  // Extract the primary language code (e.g., 'en' from 'en-US')
  const primaryLang = browserLang.split('-')[0].toLowerCase();
  
  // Check if the detected language is supported
  if (SUPPORTED_LANGUAGES.includes(primaryLang)) {
    return primaryLang;
  }
  
  // Fall back to default language
  return DEFAULT_LANGUAGE;
}

/**
 * Loads translations for a specific language
 * Uses caching to avoid reloading the same translations
 * 
 * @param {string} langCode - The language code to load (e.g., 'en', 'fr')
 * @returns {Promise<Object>} The translations object
 */
async function loadTranslations(langCode) {
  // Validate language code
  if (!SUPPORTED_LANGUAGES.includes(langCode)) {
    console.warn(`Language '${langCode}' not supported, falling back to '${DEFAULT_LANGUAGE}'`);
    langCode = DEFAULT_LANGUAGE;
  }
  
  // Return cached translations if available
  if (translationsCache[langCode]) {
    return translationsCache[langCode];
  }
  
  try {
    // Fetch the translation file
    const response = await fetch(chrome.runtime.getURL(`i18n/${langCode}.json`));
    
    if (!response.ok) {
      throw new Error(`Failed to load translations for '${langCode}'`);
    }
    
    // Parse and cache the translations
    const translations = await response.json();
    translationsCache[langCode] = translations;
    
    return translations;
  } catch (error) {
    console.error(`Error loading translations for '${langCode}':`, error);
    
    // Fall back to default language if not already trying to load it
    if (langCode !== DEFAULT_LANGUAGE) {
      return loadTranslations(DEFAULT_LANGUAGE);
    }
    
    // Return empty object if even default language fails
    return {};
  }
}

/**
 * Gets a translated string by key path
 * Supports nested keys using dot notation (e.g., 'popup.title')
 * 
 * @param {string} keyPath - The dot-notation path to the translation
 * @param {Object} translations - The translations object
 * @returns {string} The translated string or the key if not found
 */
function getTranslation(keyPath, translations) {
  // Split the key path into parts
  const keys = keyPath.split('.');
  
  // Navigate through the translations object
  let result = translations;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      // Key not found, return the original key path
      console.warn(`Translation key '${keyPath}' not found`);
      return keyPath;
    }
  }
  
  return result;
}

/**
 * Saves the user's language preference to chrome.storage.sync
 * This syncs across all devices where the user is logged in
 * 
 * @param {string} langCode - The language code to save
 * @returns {Promise<void>}
 */
async function saveLanguagePreference(langCode) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ language: langCode }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        currentLanguage = langCode;
        resolve();
      }
    });
  });
}

/**
 * Loads the user's language preference from chrome.storage.sync
 * Falls back to browser detection if no preference is saved
 * 
 * @returns {Promise<string>} The saved language code or detected language
 */
async function loadLanguagePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['language'], (result) => {
      if (result.language && SUPPORTED_LANGUAGES.includes(result.language)) {
        currentLanguage = result.language;
        resolve(result.language);
      } else {
        // No saved preference, detect from browser
        const detectedLang = detectBrowserLanguage();
        currentLanguage = detectedLang;
        resolve(detectedLang);
      }
    });
  });
}

/**
 * Updates all UI elements with translations
 * Elements should have a 'data-i18n' attribute with the translation key
 * 
 * @param {Object} translations - The translations object
 */
function updateUIWithTranslations(translations) {
  // Find all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key, translations);
    
    // Update element content based on its type
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      // For input elements, update placeholder if specified
      if (element.hasAttribute('data-i18n-placeholder')) {
        element.placeholder = translation;
      } else {
        element.value = translation;
      }
    } else if (element.tagName === 'OPTION') {
      // For option elements, update text content
      element.textContent = translation;
    } else {
      // For other elements, update text content
      element.textContent = translation;
    }
  });
  
  // Update placeholders separately for elements with data-i18n-placeholder
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = getTranslation(key, translations);
    element.placeholder = translation;
  });
}

/**
 * Initializes the i18n system
 * Loads saved preference (or detects language) and applies translations
 * 
 * @returns {Promise<Object>} The loaded translations
 */
async function initI18n() {
  // Load the user's language preference
  const langCode = await loadLanguagePreference();
  
  // Load translations for the selected language
  const translations = await loadTranslations(langCode);
  
  // Update the UI with translations
  updateUIWithTranslations(translations);
  
  return translations;
}

/**
 * Changes the current language and updates the UI
 * 
 * @param {string} langCode - The new language code
 * @returns {Promise<Object>} The new translations
 */
async function changeLanguage(langCode) {
  // Validate language code
  if (!SUPPORTED_LANGUAGES.includes(langCode)) {
    throw new Error(`Language '${langCode}' is not supported`);
  }
  
  // Save the new preference
  await saveLanguagePreference(langCode);
  
  // Load translations for the new language
  const translations = await loadTranslations(langCode);
  
  // Update the UI
  updateUIWithTranslations(translations);
  
  return translations;
}

/**
 * Gets the current language code
 * 
 * @returns {string} The current language code
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Gets the list of supported languages
 * 
 * @returns {string[]} Array of supported language codes
 */
function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

// Export functions for use in other modules
// Using window object for browser extension compatibility
window.i18n = {
  init: initI18n,
  changeLanguage,
  loadTranslations,
  getTranslation,
  getCurrentLanguage,
  getSupportedLanguages,
  detectBrowserLanguage,
  saveLanguagePreference,
  loadLanguagePreference,
  updateUI: updateUIWithTranslations,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
};
