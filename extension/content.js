/**
 * QuickText AI - Content Script
 * 
 * Runs in the context of web pages to:
 * - Capture and track text selection
 * - Handle text insertion at cursor position
 * - Communicate with background script and popup
 * - Provide visual feedback for context menu actions
 * 
 * Cross-browser compatible: Chrome, Firefox, Edge
 * 
 * @module content
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Message types - must match background.js */
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

/** CSS class prefix to avoid conflicts */
const CSS_PREFIX = 'quicktext-ai';

/** Selection tracking state */
let currentSelection = {
  text: '',
  range: null,
  timestamp: 0
};

/** Active element tracking for text insertion */
let lastActiveElement = null;
let lastCursorPosition = { start: 0, end: 0 };

// ============================================================================
// BROWSER COMPATIBILITY
// ============================================================================

/**
 * Cross-browser runtime API
 * Handles differences between Chrome and Firefox
 */
const runtime = {
  /**
   * Sends a message to the background script
   * @param {object} message - Message to send
   * @returns {Promise<any>} Response from background
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
};

// ============================================================================
// SELECTION HANDLING
// ============================================================================

/**
 * Gets the currently selected text on the page
 * Handles both regular selections and input/textarea selections
 * 
 * @returns {string} Selected text, trimmed
 */
function getSelectedText() {
  // Check for selection in input/textarea first
  const activeElement = document.activeElement;
  
  if (activeElement && isEditableElement(activeElement)) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    
    if (start !== end) {
      return activeElement.value.substring(start, end).trim();
    }
  }
  
  // Fall back to window selection
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

/**
 * Gets detailed selection information including range
 * Useful for later text replacement
 * 
 * @returns {object} Selection details
 */
function getSelectionDetails() {
  const selection = window.getSelection();
  const text = getSelectedText();
  
  let range = null;
  if (selection && selection.rangeCount > 0) {
    range = selection.getRangeAt(0).cloneRange();
  }
  
  return {
    text,
    range,
    hasSelection: text.length > 0,
    isInEditableArea: isEditableElement(document.activeElement),
    timestamp: Date.now()
  };
}

/**
 * Tracks selection changes and updates state
 * Called on mouseup and keyup events
 */
function trackSelection() {
  const selection = getSelectionDetails();
  
  if (selection.text) {
    currentSelection = {
      text: selection.text,
      range: selection.range,
      timestamp: selection.timestamp
    };
    
    // Track active element for later insertion
    if (selection.isInEditableArea) {
      lastActiveElement = document.activeElement;
      lastCursorPosition = {
        start: document.activeElement.selectionStart,
        end: document.activeElement.selectionEnd
      };
    }
  }
}

// ============================================================================
// TEXT INSERTION
// ============================================================================

/**
 * Checks if an element is editable (input, textarea, contenteditable)
 * 
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is editable
 */
function isEditableElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName?.toLowerCase();
  
  // Check for input/textarea
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    const type = element.type?.toLowerCase();
    const editableTypes = ['text', 'email', 'password', 'search', 'tel', 'url', ''];
    return editableTypes.includes(type);
  }
  
  // Check for contenteditable
  if (element.isContentEditable) return true;
  
  return false;
}

/**
 * Inserts text at the current cursor position or replaces selection
 * Handles input/textarea and contenteditable elements
 * 
 * @param {string} text - Text to insert
 * @param {object} options - Insertion options
 * @returns {boolean} True if insertion was successful
 */
function insertTextAtCursor(text, options = {}) {
  const { replaceSelection = true, targetElement = null } = options;
  
  // Determine target element
  const element = targetElement || lastActiveElement || document.activeElement;
  
  if (!element || !isEditableElement(element)) {
    console.warn('QuickText AI: No editable element found for text insertion');
    return false;
  }
  
  try {
    if (element.tagName.toLowerCase() === 'textarea' || 
        element.tagName.toLowerCase() === 'input') {
      return insertIntoInputElement(element, text, replaceSelection);
    } else if (element.isContentEditable) {
      return insertIntoContentEditable(element, text, replaceSelection);
    }
  } catch (error) {
    console.error('QuickText AI: Error inserting text:', error);
  }
  
  return false;
}

/**
 * Inserts text into input or textarea elements
 * 
 * @param {HTMLInputElement|HTMLTextAreaElement} element - Target element
 * @param {string} text - Text to insert
 * @param {boolean} replaceSelection - Whether to replace current selection
 * @returns {boolean} Success status
 */
function insertIntoInputElement(element, text, replaceSelection) {
  // Focus the element
  element.focus();
  
  // Get current selection
  const start = element.selectionStart || 0;
  const end = element.selectionEnd || 0;
  const value = element.value;
  
  // Determine insertion point
  let insertStart = start;
  let insertEnd = end;
  
  if (!replaceSelection || start === end) {
    // Insert at cursor position
    insertEnd = start;
  }
  
  // Create new value
  const newValue = value.substring(0, insertStart) + text + value.substring(insertEnd);
  
  // Update element
  element.value = newValue;
  
  // Position cursor at end of inserted text
  const newCursorPos = insertStart + text.length;
  element.selectionStart = newCursorPos;
  element.selectionEnd = newCursorPos;
  
  // Trigger input event for framework reactivity
  dispatchInputEvents(element);
  
  return true;
}

/**
 * Inserts text into contenteditable elements
 * 
 * @param {Element} element - Contenteditable element
 * @param {string} text - Text to insert
 * @param {boolean} replaceSelection - Whether to replace current selection
 * @returns {boolean} Success status
 */
function insertIntoContentEditable(element, text, replaceSelection) {
  element.focus();
  
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    // No selection, append to end
    element.textContent += text;
    return true;
  }
  
  const range = selection.getRangeAt(0);
  
  if (replaceSelection) {
    // Delete current selection
    range.deleteContents();
  } else {
    // Collapse to end of selection
    range.collapse(false);
  }
  
  // Insert new text
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  
  // Move cursor to end of inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Trigger input event
  dispatchInputEvents(element);
  
  return true;
}

/**
 * Dispatches input events to notify frameworks of changes
 * 
 * @param {Element} element - Element that was modified
 */
function dispatchInputEvents(element) {
  // Input event (for React, Vue, etc.)
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  
  // Change event (for some form handlers)
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

// ============================================================================
// VISUAL FEEDBACK
// ============================================================================

/**
 * Injects required CSS styles for visual feedback
 * Only injects once per page
 */
function injectStyles() {
  if (document.getElementById(`${CSS_PREFIX}-styles`)) {
    return; // Already injected
  }
  
  const styles = document.createElement('style');
  styles.id = `${CSS_PREFIX}-styles`;
  styles.textContent = `
    .${CSS_PREFIX}-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #4f46e5;
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    
    .${CSS_PREFIX}-notification.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .${CSS_PREFIX}-highlight {
      background-color: rgba(79, 70, 229, 0.2) !important;
      outline: 2px solid #4f46e5 !important;
      outline-offset: 2px;
      transition: all 0.2s ease;
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Shows a temporary notification to the user
 * 
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, duration = 2000) {
  injectStyles();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `${CSS_PREFIX}-notification`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });
  
  // Remove after duration
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 200);
  }, duration);
}

/**
 * Highlights an element temporarily
 * 
 * @param {Element} element - Element to highlight
 * @param {number} duration - Duration in milliseconds
 */
function highlightElement(element, duration = 1000) {
  if (!element) return;
  
  injectStyles();
  
  element.classList.add(`${CSS_PREFIX}-highlight`);
  
  setTimeout(() => {
    element.classList.remove(`${CSS_PREFIX}-highlight`);
  }, duration);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Validates incoming messages
 * 
 * @param {object} message - Message to validate
 * @returns {boolean} True if valid
 */
function isValidMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (!message.type || typeof message.type !== 'string') return false;
  return Object.values(MessageTypes).includes(message.type);
}

/**
 * Handles incoming messages from background script or popup
 * 
 * @param {object} message - Incoming message
 * @param {object} sender - Sender information
 * @param {function} sendResponse - Response callback
 * @returns {boolean} True if response is async
 */
function handleMessage(message, sender, sendResponse) {
  // Validate message
  if (!isValidMessage(message)) {
    sendResponse({ success: false, error: 'Invalid message' });
    return false;
  }
  
  // Verify sender is from our extension
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ success: false, error: 'Invalid sender' });
    return false;
  }
  
  try {
    switch (message.type) {
      case MessageTypes.GET_SELECTED_TEXT:
        // Return currently selected text
        const text = getSelectedText();
        sendResponse({ success: true, text });
        break;
        
      case MessageTypes.INSERT_TEXT:
        // Insert text at cursor position
        if (!message.text) {
          sendResponse({ success: false, error: 'No text provided' });
        } else {
          const inserted = insertTextAtCursor(message.text, {
            replaceSelection: message.replaceSelection !== false
          });
          sendResponse({ success: inserted });
          
          if (inserted) {
            showNotification('Text inserted');
          }
        }
        break;
        
      case MessageTypes.CONTEXT_MENU_CLICKED:
        // Context menu was clicked - show feedback
        if (message.text) {
          showNotification('Opening QuickText AI...', 1500);
        }
        sendResponse({ success: true });
        break;
        
      case MessageTypes.PING:
        // Health check
        sendResponse({ success: true, pong: true, ready: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('QuickText AI: Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return false; // Synchronous response
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Sets up event listeners for selection tracking
 */
function setupEventListeners() {
  // Track selection on mouse up (after click/drag selection)
  document.addEventListener('mouseup', () => {
    // Small delay to ensure selection is complete
    setTimeout(trackSelection, 10);
  }, true);
  
  // Track selection on keyboard shortcuts (Shift+Arrow, Ctrl+A, etc.)
  document.addEventListener('keyup', (event) => {
    // Only track if shift was involved (selection) or Ctrl+A
    if (event.shiftKey || (event.ctrlKey && event.key === 'a')) {
      setTimeout(trackSelection, 10);
    }
  }, true);
  
  // Track focus changes to remember last editable element
  document.addEventListener('focusin', (event) => {
    if (isEditableElement(event.target)) {
      lastActiveElement = event.target;
    }
  }, true);
  
  // Track cursor position in editable elements
  document.addEventListener('click', (event) => {
    if (isEditableElement(event.target)) {
      lastActiveElement = event.target;
      setTimeout(() => {
        lastCursorPosition = {
          start: event.target.selectionStart || 0,
          end: event.target.selectionEnd || 0
        };
      }, 0);
    }
  }, true);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the content script
 */
function initialize() {
  // Check if already initialized (prevent double initialization in iframes)
  if (window.__quickTextAIInitialized) {
    return;
  }
  window.__quickTextAIInitialized = true;
  
  // Set up event listeners
  setupEventListeners();
  
  // Register message handler
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Log initialization (only in main frame for cleaner logs)
  if (window === window.top) {
    console.log('QuickText AI: Content script initialized');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// ============================================================================
// EXPORTS (for potential testing)
// ============================================================================

// Expose API for testing (only in development)
if (typeof window !== 'undefined') {
  window.__quickTextAIContent = {
    getSelectedText,
    getSelectionDetails,
    insertTextAtCursor,
    isEditableElement,
    showNotification,
    MessageTypes
  };
}
