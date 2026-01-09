/**
 * QuickText AI - API Service (Free & Unlimited Version)
 * 
 * Handles all communication with the QuickText AI backend API.
 * Simplified version without authentication or quota management.
 * 
 * Features:
 * - Request/response handling
 * - Error handling and retries
 * - Timeout management
 * 
 * @module api
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * API Configuration
 */
const API_CONFIG = {
  // Base URL for the API (change for production)
  baseUrl: 'http://localhost:3000/api/v1',
  
  // Request timeout in milliseconds
  timeout: 30000,
  
  // Retry configuration
  maxRetries: 2,
  retryDelay: 1000
};

/**
 * Storage keys for config
 */
const StorageKeys = {
  API_BASE_URL: 'qt_api_base_url'
};

/**
 * API Error codes
 */
const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Custom API Error class with additional context
 */
class APIError extends Error {
  constructor(message, code, status, details = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  /**
   * Returns a user-friendly error message
   */
  getUserMessage() {
    switch (this.code) {
      case ErrorCodes.NETWORK_ERROR:
        return 'Unable to connect. Please check your internet connection.';
      case ErrorCodes.TIMEOUT:
        return 'Request timed out. Please try again.';
      case ErrorCodes.RATE_LIMITED:
        return 'Too many requests. Please wait a moment.';
      case ErrorCodes.SERVER_ERROR:
        return 'Server error. Please try again later.';
      case ErrorCodes.SERVICE_UNAVAILABLE:
        return 'Service temporarily unavailable.';
      default:
        return this.message || 'An error occurred. Please try again.';
    }
  }
}

// =============================================================================
// Storage Helpers
// =============================================================================

/**
 * Gets a value from chrome.storage.local
 * 
 * @param {string} key - Storage key
 * @returns {Promise<any>} Stored value or null
 */
async function getFromStorage(key) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  } catch (error) {
    console.error('Storage get error:', error);
    return null;
  }
}

// =============================================================================
// HTTP Client
// =============================================================================

/**
 * Gets the API base URL (allows override from storage)
 * 
 * @returns {Promise<string>} Base URL
 */
async function getBaseUrl() {
  const customUrl = await getFromStorage(StorageKeys.API_BASE_URL);
  return customUrl || API_CONFIG.baseUrl;
}

/**
 * Creates an AbortController with timeout
 * 
 * @param {number} [timeout] - Timeout in ms
 * @returns {Object} Controller and signal
 */
function createTimeoutController(timeout = API_CONFIG.timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return {
    controller,
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

/**
 * Makes an HTTP request to the API
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function request(endpoint, options = {}) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const {
    method = 'GET',
    body = null,
    headers = {},
    timeout = API_CONFIG.timeout,
    retries = API_CONFIG.maxRetries
  } = options;
  
  // Build headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  // Create timeout controller
  const { signal, clear } = createTimeoutController(timeout);
  
  // Build request config
  const config = {
    method,
    headers: requestHeaders,
    signal
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  let lastError = null;
  
  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);
      clear();
      
      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Handle error responses
      if (!response.ok) {
        const errorCode = mapStatusToErrorCode(response.status);
        const errorMessage = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
        
        throw new APIError(errorMessage, errorCode, response.status, data?.error);
      }
      
      return data?.data || data;
      
    } catch (error) {
      clear();
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof APIError) {
        if ([400, 401, 403, 404].includes(error.status)) {
          throw error;
        }
      }
      
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        throw new APIError('Request timed out', ErrorCodes.TIMEOUT, 408);
      }
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        lastError = new APIError('Network error', ErrorCodes.NETWORK_ERROR, 0);
      }
      
      // Wait before retry (if not last attempt)
      if (attempt < retries) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Retrying request (attempt ${attempt + 2}/${retries + 1})...`);
      }
    }
  }
  
  // All retries failed
  throw lastError || new APIError('Request failed', ErrorCodes.SERVER_ERROR, 500);
}

/**
 * Maps HTTP status codes to error codes
 * 
 * @param {number} status - HTTP status code
 * @returns {string} Error code
 */
function mapStatusToErrorCode(status) {
  if (status === 429) return ErrorCodes.RATE_LIMITED;
  if (status >= 500) return ErrorCodes.SERVER_ERROR;
  if (status === 503) return ErrorCodes.SERVICE_UNAVAILABLE;
  return ErrorCodes.SERVER_ERROR;
}

// =============================================================================
// API Methods
// =============================================================================

/**
 * Initializes the API (checks connectivity)
 * 
 * @returns {Promise<Object>} API info
 */
async function initialize() {
  try {
    const info = await request('/generate/info', { method: 'GET' });
    console.log('API connected:', info);
    return info;
  } catch (error) {
    console.warn('API connection check failed:', error);
    throw error;
  }
}

/**
 * Generates AI text
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.text - Input text
 * @param {string} params.action - Action type (rewrite, polite, professional, short)
 * @param {string} [params.language] - Output language code
 * @returns {Promise<Object>} Generation result
 */
async function generate({ text, action, language = 'en' }) {
  if (!text?.trim()) {
    throw new APIError('Text is required', ErrorCodes.VALIDATION_ERROR, 400);
  }
  
  if (!action) {
    throw new APIError('Action is required', ErrorCodes.VALIDATION_ERROR, 400);
  }
  
  const response = await request('/generate', {
    method: 'POST',
    body: { text, action, language }
  });
  
  return response;
}

/**
 * Gets API health status
 * 
 * @returns {Promise<Object>} Health info
 */
async function getHealth() {
  const baseUrl = await getBaseUrl();
  const healthUrl = baseUrl.replace('/api/v1', '/health');
  
  try {
    const response = await fetch(healthUrl);
    return await response.json();
  } catch (error) {
    throw new APIError('Health check failed', ErrorCodes.NETWORK_ERROR, 0);
  }
}

// =============================================================================
// Export
// =============================================================================

window.api = {
  // Configuration
  API_CONFIG,
  ErrorCodes,
  
  // Classes
  APIError,
  
  // Methods
  initialize,
  generate,
  getHealth,
  getBaseUrl,
  
  // Low-level
  request
};
