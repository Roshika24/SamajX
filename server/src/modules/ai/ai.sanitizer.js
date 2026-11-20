'use strict';

/**
 * PII Sanitizer for SamajX AI Layer.
 *
 * Removes personally identifiable information (PII) before passing
 * citizen-submitted problem text to external AI providers.
 *
 * Note: Regex-based redaction covers common PII formats (emails, phone numbers,
 * credential tokens), but cannot guarantee 100% semantic anonymization.
 */

// Email regex pattern
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Phone number pattern supporting Indian (e.g. +91-98765-43210 or 9876543210) and international numbers
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{4,5}\b/g;

// Credential tokens or secret markers (JWT, api keys, bearer tokens, sk_*, ghp_*)
const TOKEN_REGEX = /\b(?:bearer\s+[a-zA-Z0-9_\-\.]+|ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|(?:ghp|sk|ai|pk)(?:_[a-zA-Z0-9]+)*_[a-zA-Z0-9]{8,})\b/gi;

/**
 * Sanitize text to remove obvious PII.
 * @param {string} text - Raw input text from report/problem
 * @param {number} [maxLength=2000] - Cap text to prevent context flooding
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = 2000) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text
    .replace(TOKEN_REGEX, '[REDACTED_CREDENTIAL]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, (match) => {
      // Avoid false positive on simple years or short numbers
      const digitsOnly = match.replace(/\D/g, '');
      if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
        return '[REDACTED_PHONE]';
      }
      return match;
    })
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '... [TRUNCATED]';
  }

  return sanitized;
}

/**
 * Sanitize a problem object before LLM processing.
 * @param {{ title: string, description: string }} problem
 * @returns {{ title: string, description: string }}
 */
function sanitizeProblem(problem) {
  return {
    title: sanitizeText(problem.title, 300),
    description: sanitizeText(problem.description, 2000),
  };
}

module.exports = {
  sanitizeText,
  sanitizeProblem,
};
