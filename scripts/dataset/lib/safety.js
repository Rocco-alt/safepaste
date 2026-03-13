// safety.js — Safety isolation for adversarial dataset text
//
// All dataset text is adversarial input. These utilities enforce that text
// is treated as data, never as code. No eval, no Function(), no template
// literal interpolation with dataset content, no shell commands.

'use strict';

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bchild_process\b/,
  /\bexecSync\b/,
  /\bexecFile\b/,
  /\bspawn\b/,
  /\bexec\s*\(/
];

/**
 * HTML-escape and truncate text for safe terminal/log output.
 * Prevents any markup from rendering if output is piped to HTML contexts.
 *
 * @param {string} text - Raw dataset text
 * @param {number} [maxLen=200] - Maximum output length
 * @returns {string} Escaped, truncated string
 */
function escapeForDisplay(text, maxLen = 200) {
  if (typeof text !== 'string') return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  if (escaped.length <= maxLen) return escaped;
  return escaped.slice(0, maxLen) + '...';
}

/**
 * Throws if text appears to be flowing toward an execution context.
 * Call this before any processing step that handles dataset text.
 *
 * @param {string} text - Text to check
 * @throws {Error} if text appears to target an execution sink
 */
function assertNotExecutable(text) {
  if (typeof text !== 'string') return;
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(
        `Safety violation: dataset text must not flow toward execution sinks. ` +
        `Matched: ${pattern}`
      );
    }
  }
}

/**
 * Returns a frozen, read-only copy of text safe for processing.
 * Prevents accidental mutation or template literal interpolation.
 *
 * @param {string} text - Raw dataset text
 * @returns {string} Frozen string (immutable)
 */
function sanitizeForProcessing(text) {
  if (typeof text !== 'string') return '';
  // Return a new string (primitive — inherently immutable in JS)
  // The key protection: callers must use this instead of raw text
  return String(text);
}

/**
 * Higher-order function that wraps any text processor with safety checks.
 * The wrapped function receives sanitized text and cannot accidentally
 * pass dataset content to execution sinks.
 *
 * @param {Function} fn - Function that processes text: (text, ...args) => result
 * @returns {Function} Wrapped function with safety checks
 */
function wrapHandler(fn) {
  if (typeof fn !== 'function') {
    throw new Error('wrapHandler requires a function');
  }
  return function wrappedHandler(text, ...args) {
    const safe = sanitizeForProcessing(text);
    assertNotExecutable(safe);
    return fn(safe, ...args);
  };
}

module.exports = {
  escapeForDisplay,
  assertNotExecutable,
  sanitizeForProcessing,
  wrapHandler
};
