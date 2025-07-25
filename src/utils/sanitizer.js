// Input sanitization utilities for user-generated content

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitizes a URL to ensure it's safe to use
 * @param {string} url - The URL to sanitize
 * @returns {string} - The sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  // Trim whitespace
  url = url.trim();
  
  // Block potentially dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];
  
  const lowerUrl = url.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  // If no protocol, assume https://
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  
  // Validate URL structure
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.href;
  } catch (e) {
    return '';
  }
}

/**
 * Sanitizes user input for display in the DOM
 * Allows basic formatting but escapes dangerous content
 * @param {string} text - The text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - The sanitized text
 */
export function sanitizeText(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  
  // Default options
  const defaults = {
    allowNewlines: true,
    maxLength: 10000,
    allowBasicFormatting: false
  };
  
  const opts = { ...defaults, ...options };
  
  // Truncate if too long
  if (text.length > opts.maxLength) {
    text = text.substring(0, opts.maxLength) + '...';
  }
  
  // Escape HTML first
  text = escapeHtml(text);
  
  // Convert newlines to <br> if allowed
  if (opts.allowNewlines) {
    text = text.replace(/\n/g, '<br>');
  }
  
  // Allow basic formatting if specified
  if (opts.allowBasicFormatting) {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  }
  
  return text;
}

/**
 * Validates and sanitizes a filename
 * @param {string} filename - The filename to sanitize
 * @returns {string} - The sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'untitled';
  
  // Remove any path separators
  filename = filename.replace(/[\/\\]/g, '_');
  
  // Remove special characters that might cause issues
  filename = filename.replace(/[<>:"|?*\x00-\x1F]/g, '_');
  
  // Remove leading/trailing dots and spaces
  filename = filename.replace(/^[\s.]+|[\s.]+$/g, '');
  
  // If filename is empty after sanitization, use default
  if (!filename) return 'untitled';
  
  // Limit length
  if (filename.length > 255) {
    filename = filename.substring(0, 255);
  }
  
  return filename;
}

/**
 * Sanitizes JSON data to ensure it's safe to parse
 * @param {string} jsonString - The JSON string to sanitize
 * @returns {Object|null} - The parsed object or null if invalid
 */
export function sanitizeJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  try {
    // Parse the JSON
    const parsed = JSON.parse(jsonString);
    
    // Recursively sanitize string values
    function sanitizeObject(obj) {
      if (typeof obj === 'string') {
        return escapeHtml(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize the key as well
          const sanitizedKey = escapeHtml(key);
          sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    }
    
    return sanitizeObject(parsed);
  } catch (e) {
    return null;
  }
}

// Export all functions as default object as well
export default {
  escapeHtml,
  sanitizeUrl,
  sanitizeText,
  sanitizeFilename,
  sanitizeJson
};