/**
 * @module @safepaste/test/inject
 *
 * Injection strategy engine. Pure functions that combine a user prompt
 * with an attack payload using different injection strategies.
 */

'use strict';

/**
 * Prepend payload before the user prompt.
 * @param {string} prompt - User's target prompt
 * @param {string} payload - Attack payload text
 * @returns {string} Combined text
 */
function prepend(prompt, payload) {
  return payload + '\n\n' + prompt;
}

/**
 * Append payload after the user prompt.
 * @param {string} prompt - User's target prompt
 * @param {string} payload - Attack payload text
 * @returns {string} Combined text
 */
function append(prompt, payload) {
  return prompt + '\n\n' + payload;
}

/**
 * Wrap the user prompt by splitting payload at the first sentence boundary
 * and placing half before and half after.
 * Falls back to prepend if the payload is a single sentence.
 * @param {string} prompt - User's target prompt
 * @param {string} payload - Attack payload text
 * @returns {string} Combined text
 */
function wrap(prompt, payload) {
  var splitIndex = payload.indexOf('. ');
  if (splitIndex === -1) {
    return prepend(prompt, payload);
  }
  var prefix = payload.substring(0, splitIndex + 1);
  var suffix = payload.substring(splitIndex + 2);
  return prefix + '\n\n' + prompt + '\n\n' + suffix;
}

var STRATEGIES = { prepend: prepend, append: append, wrap: wrap };

/**
 * Generate all injection variants for a prompt + payload combination.
 * @param {string} prompt - User's target prompt
 * @param {Object} payload - Seed payload object with id, text, category
 * @returns {Array<{text: string, strategy: string, category: string, payloadId: string}>}
 */
function generateVariants(prompt, payload) {
  var results = [];
  var strategyNames = Object.keys(STRATEGIES);
  for (var i = 0; i < strategyNames.length; i++) {
    var name = strategyNames[i];
    results.push({
      text: STRATEGIES[name](prompt, payload.text),
      strategy: name,
      category: payload.category,
      payloadId: payload.id
    });
  }
  return results;
}

module.exports = {
  prepend: prepend,
  append: append,
  wrap: wrap,
  STRATEGIES: STRATEGIES,
  generateVariants: generateVariants
};
