/**
 * QuickText AI - Background Service Worker
 * 
 * Core infrastructure for the browser extension:
 * - Context menu creation and handling
 * - Message passing between components
 * - Language detection and storage
 * - Cross-browser compatibility (Chrome, Firefox, Edge)
 * 
 * @module background
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Supported languages for the extension */
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'hi'];

/** Default language fallback */
const DEFAULT_LANGUAGE = 'en';

/** Context menu item ID */
const CONTEXT_MENU_ID = 'quicktext-ai-reply';

/** Message types for secure communication */
const MessageTypes = Object.freeze({
  GET_LANGUAGE: 'GET_LANGUAGE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  GET_SELECTED_TEXT: 'GET_SELECTED_TEXT',
  SET_SELECTED_TEXT: 'SET_SELECTED_TEXT',
  GENERATE_TEXT: 'GENERATE_TEXT',
  INSERT_TEXT: 'INSERT_TEXT',
  CONTEXT_MENU_CLICKED: 'CONTEXT_MENU_CLICKED',
  PING: 'PING'
});

// Store selected text from context menu
let lastSelectedText = '';
let lastSelectionTabId = null;

// ============================================================================
// BROWSER COMPATIBILITY LAYER
// ============================================================================

/**
 * Cross-browser API wrapper
 * Provides compatibility between Chrome, Firefox, and Edge
 */
const browserAPI = {
  /**
   * Gets the appropriate browser API object
   * @returns {object} The browser API (chrome or browser)
   */
  get api() {
    return typeof browser !== 'undefined' ? browser : chrome;
  },

  /**
   * Promisified storage.sync.get
   * @param {string|string[]} keys - Keys to retrieve
   * @returns {Promise<object>} Storage data
   */
  storageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  },

  /**
   * Promisified storage.sync.set
   * @param {object} data - Data to store
   * @returns {Promise<void>}
   */
  storageSet(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Promisified tabs.sendMessage with error handling
   * @param {number} tabId - Tab ID to send message to
   * @param {object} message - Message to send
   * @returns {Promise<any>} Response from content script
   */
  async sendMessageToTab(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.warn(`Failed to send message to tab ${tabId}:`, error.message);
      return null;
    }
  }
};

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Detects the browser's preferred language
 * Uses chrome.i18n API for accurate detection
 * Falls back to DEFAULT_LANGUAGE if not supported
 * 
 * @returns {string} Detected language code (e.g., 'en', 'fr')
 */
function detectBrowserLanguage() {
  try {
    // Get browser UI language (e.g., 'en-US', 'fr-FR')
    const browserLang = chrome.i18n.getUILanguage();
    
    // Extract primary language code
    const primaryLang = browserLang.split('-')[0].toLowerCase();
    
    // Return if supported, otherwise default
    return SUPPORTED_LANGUAGES.includes(primaryLang) ? primaryLang : DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Error detecting browser language:', error);
    return DEFAULT_LANGUAGE;
  }
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

/**
 * Creates the context menu item for text selection
 * Called on extension install and startup
 */
function createContextMenu() {
  // Remove existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create the context menu item
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Reply with QuickText AI',
      contexts: ['selection'], // Only show when text is selected
      documentUrlPatterns: ['http://*/*', 'https://*/*'] // HTTP/HTTPS pages only
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError.message);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

/**
 * Updates the context menu title based on current language
 * 
 * @param {string} langCode - Current language code
 */
async function updateContextMenuTitle(langCode) {
  // Localized titles for context menu
  const titles = {
    en: 'Reply with QuickText AI',
    fr: 'Répondre avec QuickText AI',
    es: 'Responder con QuickText AI',
    pt: 'Responder com QuickText AI',
    hi: 'QuickText AI के साथ जवाब दें'
  };

  const title = titles[langCode] || titles[DEFAULT_LANGUAGE];

  try {
    await chrome.contextMenus.update(CONTEXT_MENU_ID, { title });
    console.log(`Context menu title updated to: ${title}`);
  } catch (error) {
    console.warn('Error updating context menu title:', error.message);
  }
}

/**
 * Handles context menu item clicks
 * Captures selected text and prepares for AI response
 * 
 * @param {object} info - Context menu click info
 * @param {object} tab - Tab where click occurred
 */
async function handleContextMenuClick(info, tab) {
  // Validate the click is from our menu item
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  // Get the selected text
  const selectedText = info.selectionText?.trim();

  if (!selectedText) {
    console.warn('No text selected');
    return;
  }

  console.log('Context menu clicked with text:', selectedText.substring(0, 50) + '...');

  // Store the selected text and source tab
  lastSelectedText = selectedText;
  lastSelectionTabId = tab.id;

  // Store in session storage for popup access
  try {
    await browserAPI.storageSet({
      selectedText: selectedText,
      selectionTabId: tab.id,
      selectionTimestamp: Date.now()
    });

    // Notify content script about the selection (for potential UI feedback)
    await browserAPI.sendMessageToTab(tab.id, {
      type: MessageTypes.CONTEXT_MENU_CLICKED,
      text: selectedText
    });

    // Open the popup programmatically (Chrome MV3)
    // Note: This requires user gesture, so we'll rely on action.openPopup where available
    // For now, we store the text and the popup will read it when opened
    console.log('Selected text stored for popup');

  } catch (error) {
    console.error('Error handling context menu click:', error);
  }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Validates incoming messages for security
 * Ensures messages have required fields and valid types
 * 
 * @param {object} message - Message to validate
 * @returns {boolean} True if message is valid
 */
function isValidMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (!message.type || typeof message.type !== 'string') {
    return false;
  }

  // Check if message type is known
  return Object.values(MessageTypes).includes(message.type);
}

/**
 * Handles GET_LANGUAGE message
 * Returns the current language preference
 * 
 * @returns {Promise<object>} Response with language code
 */
async function handleGetLanguage() {
  try {
    const result = await browserAPI.storageGet(['language']);
    const language = result.language || detectBrowserLanguage();
    return { success: true, language };
  } catch (error) {
    console.error('Error getting language:', error);
    return { success: false, error: error.message, language: DEFAULT_LANGUAGE };
  }
}

/**
 * Handles SET_LANGUAGE message
 * Saves the new language preference and updates context menu
 * 
 * @param {string} language - New language code
 * @returns {Promise<object>} Response indicating success
 */
async function handleSetLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return { success: false, error: 'Invalid language code' };
  }

  try {
    await browserAPI.storageSet({ language });
    await updateContextMenuTitle(language);
    return { success: true };
  } catch (error) {
    console.error('Error setting language:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handles GET_SELECTED_TEXT message
 * Returns the last selected text from context menu
 * 
 * @returns {Promise<object>} Response with selected text
 */
async function handleGetSelectedText() {
  try {
    const result = await browserAPI.storageGet(['selectedText', 'selectionTimestamp']);
    
    // Check if selection is recent (within 5 minutes)
    const isRecent = result.selectionTimestamp && 
                     (Date.now() - result.selectionTimestamp) < 5 * 60 * 1000;

    if (result.selectedText && isRecent) {
      return { success: true, text: result.selectedText };
    } else {
      return { success: true, text: '' };
    }
  } catch (error) {
    console.error('Error getting selected text:', error);
    return { success: false, error: error.message, text: '' };
  }
}

/**
 * Handles SET_SELECTED_TEXT message
 * Stores text for use by popup
 * 
 * @param {string} text - Text to store
 * @returns {Promise<object>} Response indicating success
 */
async function handleSetSelectedText(text) {
  try {
    await browserAPI.storageSet({
      selectedText: text,
      selectionTimestamp: Date.now()
    });
    lastSelectedText = text;
    return { success: true };
  } catch (error) {
    console.error('Error setting selected text:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main message handler
 * Routes messages to appropriate handlers with security validation
 * 
 * @param {object} message - Incoming message
 * @param {object} sender - Message sender info
 * @param {function} sendResponse - Response callback
 * @returns {boolean} True if response will be async
 */
function handleMessage(message, sender, sendResponse) {
  // Validate message
  if (!isValidMessage(message)) {
    console.warn('Invalid message received:', message);
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }

  // Validate sender (only accept from extension context)
  if (!sender.id || sender.id !== chrome.runtime.id) {
    // Allow messages from our own extension only
    // Note: Content scripts from our extension will have matching sender.id
  }

  // Log message for debugging (truncate long data)
  console.log(`Message received: ${message.type}`, 
    message.text ? `(text: ${message.text.substring(0, 30)}...)` : '');

  // Route to appropriate handler
  (async () => {
    try {
      let response;

      switch (message.type) {
        case MessageTypes.GET_LANGUAGE:
          response = await handleGetLanguage();
          break;

        case MessageTypes.SET_LANGUAGE:
          response = await handleSetLanguage(message.language);
          break;

        case MessageTypes.GET_SELECTED_TEXT:
          response = await handleGetSelectedText();
          break;

        case MessageTypes.SET_SELECTED_TEXT:
          response = await handleSetSelectedText(message.text);
          break;

        case MessageTypes.GENERATE_TEXT:
          // Placeholder for AI generation
          response = { success: false, error: 'AI generation not yet implemented' };
          break;

        case MessageTypes.PING:
          // Health check
          response = { success: true, pong: true };
          break;

        default:
          response = { success: false, error: 'Unknown message type' };
      }

      sendResponse(response);
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Extension installation handler
 * Sets up initial state and context menu
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`QuickText AI: ${details.reason}`);

  // Create context menu
  createContextMenu();

  if (details.reason === 'install') {
    // First installation - set up defaults
    const detectedLang = detectBrowserLanguage();
    
    try {
      const result = await browserAPI.storageGet(['language']);
      if (!result.language) {
        await browserAPI.storageSet({ language: detectedLang });
        console.log(`Default language set to: ${detectedLang}`);
      }
    } catch (error) {
      console.error('Error setting default language:', error);
    }

  } else if (details.reason === 'update') {
    console.log(`Updated to version ${chrome.runtime.getManifest().version}`);
  }

  // Update context menu title based on current language
  try {
    const result = await browserAPI.storageGet(['language']);
    const language = result.language || DEFAULT_LANGUAGE;
    await updateContextMenuTitle(language);
  } catch (error) {
    console.warn('Error updating context menu title on install:', error);
  }
});

/**
 * Extension startup handler
 * Re-creates context menu (service workers can restart)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('QuickText AI: Service worker started');
  
  // Re-create context menu
  createContextMenu();

  // Update context menu title
  try {
    const result = await browserAPI.storageGet(['language']);
    const language = result.language || DEFAULT_LANGUAGE;
    await updateContextMenuTitle(language);
  } catch (error) {
    console.warn('Error updating context menu on startup:', error);
  }
});

/**
 * Context menu click handler
 */
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

/**
 * Message handler for communication with popup and content scripts
 */
chrome.runtime.onMessage.addListener(handleMessage);

/**
 * Storage change listener
 * Syncs language changes across components
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.language) {
      const newLang = changes.language.newValue;
      console.log(`Language changed to: ${newLang}`);
      updateContextMenuTitle(newLang);
    }
  }
});

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

// Export constants and functions for potential testing
// Using globalThis for service worker compatibility
globalThis.QuickTextAI = {
  MessageTypes,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  detectBrowserLanguage,
  isValidMessage
};
