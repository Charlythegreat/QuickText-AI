/**
 * QuickText AI - Popup Script (Free & Unlimited Version)
 * 
 * Handles all popup UI interactions:
 * - Language selector
 * - Quick action buttons (Rewrite, Polite, Professional, Short)
 * - Input/output text areas
 * - Loading and error states
 * - Copy, paste, and insert functionality
 * 
 * @module popup
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum character limit for input (generous limit for free version) */
const MAX_CHARS = 10000;

/** Action types for AI generation */
const ActionTypes = Object.freeze({
  REWRITE: 'rewrite',
  POLITE: 'polite',
  PROFESSIONAL: 'professional',
  SHORT: 'short'
});

// ============================================================================
// STATE
// ============================================================================

/** Current translations object */
let translations = {};

/** Current action being processed */
let currentAction = null;

/** Last used action for regeneration */
let lastAction = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
  // Header
  languageSelect: null,
  
  // Input
  inputText: null,
  pasteBtn: null,
  charCount: null,
  
  // Actions
  actionButtons: null,
  
  // Output
  outputSection: null,
  outputText: null,
  copyBtn: null,
  insertBtn: null,
  regenerateBtn: null,
  
  // States
  loadingState: null,
  errorState: null,
  errorMessage: null,
  retryBtn: null,
  
  // Toast
  statusToast: null,
  
  // Footer
  settingsBtn: null
};

/**
 * Initializes DOM element references
 */
function initElements() {
  elements.languageSelect = document.getElementById('language-select');
  elements.inputText = document.getElementById('input-text');
  elements.pasteBtn = document.getElementById('paste-btn');
  elements.charCount = document.getElementById('char-count');
  elements.actionButtons = document.querySelectorAll('.action-btn');
  elements.outputSection = document.getElementById('output-section');
  elements.outputText = document.getElementById('output-text');
  elements.copyBtn = document.getElementById('copy-btn');
  elements.insertBtn = document.getElementById('insert-btn');
  elements.regenerateBtn = document.getElementById('regenerate-btn');
  elements.loadingState = document.getElementById('loading-state');
  elements.errorState = document.getElementById('error-state');
  elements.errorMessage = document.getElementById('error-message');
  elements.retryBtn = document.getElementById('retry-btn');
  elements.statusToast = document.getElementById('status-toast');
  elements.settingsBtn = document.getElementById('settings-btn');
}

// ============================================================================
// LANGUAGE HANDLING
// ============================================================================

/**
 * Populates the language selector dropdown
 * 
 * @param {string} currentLang - Currently selected language code
 */
async function populateLanguageSelector(currentLang) {
  const selector = elements.languageSelect;
  selector.innerHTML = '';
  
  const supportedLanguages = window.i18n.getSupportedLanguages();
  
  for (const langCode of supportedLanguages) {
    const option = document.createElement('option');
    option.value = langCode;
    option.textContent = window.i18n.getTranslation(`languages.${langCode}`, translations);
    
    if (langCode === currentLang) {
      option.selected = true;
    }
    
    selector.appendChild(option);
  }
}

/**
 * Handles language change from dropdown
 * 
 * @param {Event} event - Change event
 */
async function handleLanguageChange(event) {
  const newLang = event.target.value;
  
  try {
    translations = await window.i18n.changeLanguage(newLang);
    await populateLanguageSelector(newLang);
    updateActionButtonLabels();
    showToast(translations.messages?.languageChanged || 'Language changed', 'success');
  } catch (error) {
    console.error('Error changing language:', error);
    showToast(translations.messages?.error || 'Error changing language', 'error');
  }
}

/**
 * Updates action button labels with current translations
 */
function updateActionButtonLabels() {
  elements.actionButtons.forEach(btn => {
    const action = btn.dataset.action;
    const labelKey = `popup.action${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const label = window.i18n.getTranslation(labelKey, translations);
    
    // Update only the text span, not the icon
    const textSpan = btn.querySelector('span');
    if (textSpan && label !== labelKey) {
      textSpan.textContent = label;
    }
  });
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Updates the character count display
 */
function updateCharCount() {
  const count = elements.inputText.value.length;
  elements.charCount.textContent = `${count} / ${MAX_CHARS}`;
  
  // Update styling based on count
  elements.charCount.classList.remove('warning', 'error');
  
  if (count >= MAX_CHARS) {
    elements.charCount.classList.add('error');
  } else if (count >= MAX_CHARS * 0.9) {
    elements.charCount.classList.add('warning');
  }
  
  // Enable/disable action buttons based on input
  const hasInput = count > 0;
  elements.actionButtons.forEach(btn => {
    btn.disabled = !hasInput;
  });
}

/**
 * Handles paste button click
 */
async function handlePasteClick() {
  try {
    const text = await navigator.clipboard.readText();
    
    // Truncate if exceeds max
    const truncatedText = text.substring(0, MAX_CHARS);
    elements.inputText.value = truncatedText;
    updateCharCount();
    
    if (text.length > MAX_CHARS) {
      showToast(translations.messages?.textTruncated || 'Text truncated to limit', 'warning');
    }
  } catch (error) {
    console.error('Error pasting:', error);
    showToast(translations.messages?.pasteError || 'Unable to paste', 'error');
  }
}

/**
 * Handles input text changes
 */
function handleInputChange() {
  // Enforce character limit
  if (elements.inputText.value.length > MAX_CHARS) {
    elements.inputText.value = elements.inputText.value.substring(0, MAX_CHARS);
  }
  
  updateCharCount();
}

// ============================================================================
// ACTION HANDLING
// ============================================================================

/**
 * Handles action button clicks (Rewrite, Polite, Professional, Short)
 * 
 * @param {Event} event - Click event
 */
async function handleActionClick(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  
  if (!action || !elements.inputText.value.trim()) {
    return;
  }
  
  await performAction(action);
}

/**
 * Performs the AI generation action (no quota checks - fully free!)
 * 
 * @param {string} action - Action type from ActionTypes
 */
async function performAction(action) {
  const inputText = elements.inputText.value.trim();
  
  if (!inputText) {
    showToast(translations.messages?.noInput || 'Please enter some text', 'error');
    return;
  }
  
  currentAction = action;
  lastAction = action;
  
  // Show loading state
  showLoadingState(true);
  hideErrorState();
  hideOutputSection();
  
  // Disable action buttons
  setActionButtonsDisabled(true);
  
  try {
    // Get current language
    const language = elements.languageSelect.value || 'en';
    
    // Call the backend API (no authentication needed for free version)
    const response = await window.api.generate({
      text: inputText,
      action: action,
      language: language
    });
    
    // Show output
    elements.outputText.value = response.result;
    showOutputSection();
    
    // Show success toast with timing info
    const timing = response.metadata?.processingTime 
      ? ` (${(response.metadata.processingTime / 1000).toFixed(1)}s)`
      : '';
    showToast(
      (translations.messages?.generated || 'Response generated!') + timing,
      'success'
    );
    
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Get user-friendly error message
    const errorMessage = error instanceof window.api.APIError
      ? error.getUserMessage()
      : (error.message || translations.messages?.error || 'An error occurred');
    
    showErrorState(errorMessage);
    
    // Show specific toast for certain errors
    if (error.code === window.api.ErrorCodes?.RATE_LIMITED) {
      showToast(translations.messages?.rateLimited || 'Rate limit exceeded. Please wait.', 'warning');
    } else if (error.code === window.api.ErrorCodes?.NETWORK_ERROR) {
      showToast(translations.messages?.networkError || 'Network error. Check your connection.', 'error');
    }
    
  } finally {
    showLoadingState(false);
    setActionButtonsDisabled(false);
    currentAction = null;
  }
}

/**
 * Handles regenerate button click
 */
async function handleRegenerateClick() {
  if (lastAction) {
    await performAction(lastAction);
  }
}

/**
 * Sets the disabled state of action buttons
 * 
 * @param {boolean} disabled - Whether buttons should be disabled
 */
function setActionButtonsDisabled(disabled) {
  elements.actionButtons.forEach(btn => {
    btn.disabled = disabled;
    btn.classList.toggle('loading', disabled);
  });
}

// ============================================================================
// OUTPUT HANDLING
// ============================================================================

/**
 * Shows the output section
 */
function showOutputSection() {
  elements.outputSection.hidden = false;
}

/**
 * Hides the output section
 */
function hideOutputSection() {
  elements.outputSection.hidden = true;
}

/**
 * Handles copy button click
 */
async function handleCopyClick() {
  const text = elements.outputText.value;
  
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    elements.copyBtn.classList.add('copied');
    setTimeout(() => {
      elements.copyBtn.classList.remove('copied');
    }, 1500);
    
    showToast(translations.messages?.copied || 'Copied!', 'success');
  } catch (error) {
    console.error('Error copying:', error);
    showToast(translations.messages?.copyError || 'Unable to copy', 'error');
  }
}

/**
 * Handles insert button click
 * Sends the generated text to the content script for insertion
 */
async function handleInsertClick() {
  const text = elements.outputText.value;
  
  if (!text) return;
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      throw new Error('No active tab');
    }
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'INSERT_TEXT',
      text: text
    });
    
    if (response?.success) {
      showToast(translations.messages?.inserted || 'Text inserted!', 'success');
      // Close popup after successful insertion
      setTimeout(() => window.close(), 500);
    } else {
      throw new Error(response?.error || 'Failed to insert');
    }
  } catch (error) {
    console.error('Error inserting:', error);
    showToast(translations.messages?.insertError || 'Unable to insert text', 'error');
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Shows or hides the loading state
 * 
 * @param {boolean} show - Whether to show loading state
 */
function showLoadingState(show) {
  elements.loadingState.hidden = !show;
}

/**
 * Shows the error state with a message
 * 
 * @param {string} message - Error message to display
 */
function showErrorState(message) {
  elements.errorMessage.textContent = message;
  elements.errorState.hidden = false;
}

/**
 * Hides the error state
 */
function hideErrorState() {
  elements.errorState.hidden = true;
}

/**
 * Handles retry button click
 */
function handleRetryClick() {
  hideErrorState();
  
  if (lastAction) {
    performAction(lastAction);
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/** Timeout ID for toast auto-hide */
let toastTimeout = null;

/**
 * Shows a toast notification
 * 
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success', 'error', 'info', 'warning')
 */
function showToast(message, type = 'info') {
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  const toast = elements.statusToast;
  toast.textContent = message;
  toast.className = `status-toast ${type}`;
  toast.hidden = false;
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto-hide after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 3000);
}

// ============================================================================
// SELECTED TEXT
// ============================================================================

/**
 * Loads any previously selected text from storage
 */
async function loadSelectedText() {
  try {
    const result = await chrome.storage.sync.get(['selectedText', 'selectionTimestamp']);
    
    // Check if selection is recent (within 5 minutes)
    const isRecent = result.selectionTimestamp && 
                     (Date.now() - result.selectionTimestamp) < 5 * 60 * 1000;
    
    if (result.selectedText && isRecent) {
      elements.inputText.value = result.selectedText.substring(0, MAX_CHARS);
      updateCharCount();
      
      // Clear the stored selection
      await chrome.storage.sync.remove(['selectedText', 'selectionTimestamp']);
    }
  } catch (error) {
    console.error('Error loading selected text:', error);
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Initializes all event listeners
 */
function initEventListeners() {
  // Language selector
  elements.languageSelect.addEventListener('change', handleLanguageChange);
  
  // Input
  elements.inputText.addEventListener('input', handleInputChange);
  elements.pasteBtn.addEventListener('click', handlePasteClick);
  
  // Action buttons
  elements.actionButtons.forEach(btn => {
    btn.addEventListener('click', handleActionClick);
  });
  
  // Output actions
  elements.copyBtn.addEventListener('click', handleCopyClick);
  elements.insertBtn.addEventListener('click', handleInsertClick);
  elements.regenerateBtn.addEventListener('click', handleRegenerateClick);
  
  // Error state
  elements.retryBtn.addEventListener('click', handleRetryClick);
  
  // Footer
  elements.settingsBtn.addEventListener('click', () => {
    showToast('Settings coming soon!', 'info');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handles keyboard shortcuts
 * 
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + Enter to generate with last action
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    
    if (lastAction && elements.inputText.value.trim()) {
      performAction(lastAction);
    } else if (elements.inputText.value.trim()) {
      // Default to rewrite if no previous action
      performAction(ActionTypes.REWRITE);
    }
  }
  
  // Escape to close popup
  if (event.key === 'Escape') {
    window.close();
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the popup
 */
async function initPopup() {
  try {
    // Initialize DOM references
    initElements();
    
    // Initialize i18n
    translations = await window.i18n.init();
    const currentLang = window.i18n.getCurrentLanguage();
    
    // Populate language selector
    await populateLanguageSelector(currentLang);
    
    // Update action button labels
    updateActionButtonLabels();
    
    // Initialize API
    if (window.api) {
      try {
        await window.api.initialize();
        console.log('API initialized');
      } catch (apiError) {
        console.warn('API initialization warning:', apiError);
      }
    }
    
    // Load any selected text from context menu
    await loadSelectedText();
    
    // Update character count
    updateCharCount();
    
    // Initialize event listeners
    initEventListeners();
    
    console.log('QuickText AI popup initialized (Free & Unlimited)');
  } catch (error) {
    console.error('Error initializing popup:', error);
    showToast('Error initializing. Please try again.', 'error');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPopup);
