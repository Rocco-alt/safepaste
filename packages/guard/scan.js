/**
 * @module scan
 *
 * Core scanning wrapper for @safepaste/guard.
 * Resolves @safepaste/core, converts values to scannable strings,
 * and assembles GuardResult objects.
 */

'use strict';

/**
 * Resolve @safepaste/core: try npm first, monorepo fallback.
 * @returns {Object} The core module
 */
function resolveCore() {
  try {
    return require('@safepaste/core');
  } catch (e) {
    return require('../core');
  }
}

/**
 * Convert a value to a scannable string.
 * @param {*} value - Value to convert
 * @returns {string|null} Scannable string, or null if not scannable
 */
function toScannable(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    return null;
  }
}

/**
 * Scan text using @safepaste/core's scanPrompt.
 * @param {string} text - Text to scan
 * @param {Object} [options] - Options
 * @param {boolean} [options.strict=false] - Use strict mode
 * @returns {{ result: Object, durationMs: number }} Scan result and timing
 */
function scanText(text, options) {
  var opts = options || {};
  var core = resolveCore();
  var start = Date.now();
  var result = core.scanPrompt(text, { strictMode: !!opts.strict });
  var durationMs = Date.now() - start;
  return { result: result, durationMs: durationMs };
}

/**
 * Build a GuardResult from scan data and context.
 * @param {Object} scanData - { result, durationMs } from scanText
 * @param {string} action - 'pass', 'log', 'warn', 'block', or 'callback'
 * @param {Object} context - { point, tool, mode }
 * @returns {Object} GuardResult
 */
function buildGuardResult(scanData, action, context) {
  return {
    flagged: scanData.result.flagged,
    action: action,
    scan: scanData.result,
    guard: {
      point: context.point,
      tool: context.tool || null,
      mode: context.mode,
      timestamp: Date.now(),
      durationMs: scanData.durationMs
    }
  };
}

module.exports = {
  resolveCore: resolveCore,
  toScannable: toScannable,
  scanText: scanText,
  buildGuardResult: buildGuardResult
};
