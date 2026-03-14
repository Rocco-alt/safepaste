/**
 * @module @safepaste/core
 *
 * Prompt injection detection SDK for AI applications.
 * Lightweight regex-based engine with weighted scoring, benign-context
 * dampening, and zero dependencies.
 */

'use strict';

var detect = require('./detect');
var PATTERNS = require('./patterns');

/**
 * @typedef {Object} ScanMatch
 * @property {string} id - Pattern ID (e.g., "override.ignore_previous")
 * @property {string} category - Attack category (e.g., "instruction_override")
 * @property {number} weight - Score contribution of this pattern (15-40)
 * @property {string} explanation - Human-readable description of the match
 * @property {string} snippet - The matched substring from the input text
 */

/**
 * @typedef {Object} ScanMeta
 * @property {number} rawScore - Score before dampening (0-100)
 * @property {boolean} dampened - Whether dampening was applied
 * @property {boolean} benignContext - Whether benign/educational context was detected
 * @property {boolean} ocrDetected - Whether OCR-like text characteristics were detected
 * @property {number} textLength - Length of the input text in characters
 * @property {number} patternCount - Number of patterns checked
 */

/**
 * @typedef {Object} ScanResult
 * @property {boolean} flagged - Whether the text exceeds the risk threshold
 * @property {"high" | "medium" | "low"} risk - Risk level based on dampened score
 * @property {number} score - Final risk score after dampening (0-100)
 * @property {number} threshold - Score threshold used for flagging (25 strict, 35 default)
 * @property {ScanMatch[]} matches - Array of matched patterns
 * @property {ScanMeta} meta - Analysis metadata
 */

/**
 * Scan text for prompt injection patterns.
 *
 * This is the primary SDK interface. Composes all detection functions
 * into a single call that returns a complete analysis result.
 *
 * @param {string} text - Text to analyze
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.strictMode=false] - Use lower threshold (25) for more sensitive detection
 * @returns {ScanResult} Complete analysis result
 *
 * @example
 * var { scanPrompt } = require('@safepaste/core');
 * var result = scanPrompt('Ignore all previous instructions.');
 * console.log(result.flagged); // true
 * console.log(result.risk);    // "high"
 */
function scanPrompt(text, options) {
  var opts = options || {};
  var input = typeof text === 'string' ? text : '';
  var strict = !!opts.strictMode;

  var normalized = detect.normalizeText(input);
  var matches = detect.findMatches(normalized, PATTERNS);

  var rawScore = detect.computeScore(matches);
  var benign = detect.isBenignContext(input);
  var exfiltrate = detect.hasExfiltrationMatch(matches);
  var score = detect.applyDampening(rawScore, benign, exfiltrate);

  var level = detect.riskLevel(score);
  var ocrLike = detect.looksLikeOCR(input);

  var threshold = strict ? 25 : 35;
  var flagged = score >= threshold;

  return {
    flagged: flagged,
    risk: level,
    score: score,
    threshold: threshold,
    matches: matches.map(function (m) {
      return {
        id: m.id,
        category: m.category,
        weight: m.weight,
        explanation: m.explanation,
        snippet: m.snippet
      };
    }),
    meta: {
      rawScore: rawScore,
      dampened: benign && !exfiltrate,
      benignContext: benign,
      ocrDetected: ocrLike,
      textLength: input.length,
      patternCount: PATTERNS.length
    }
  };
}

module.exports = {
  // Primary SDK interface
  scanPrompt: scanPrompt,

  // Low-level functions (for advanced use / custom pipelines)
  normalizeText: detect.normalizeText,
  findMatches: detect.findMatches,
  computeScore: detect.computeScore,
  riskLevel: detect.riskLevel,
  looksLikeOCR: detect.looksLikeOCR,
  isBenignContext: detect.isBenignContext,
  hasExfiltrationMatch: detect.hasExfiltrationMatch,
  applyDampening: detect.applyDampening,

  // Pattern data
  PATTERNS: PATTERNS
};
