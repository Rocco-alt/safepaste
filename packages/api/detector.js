// detector.js — Prompt injection detection engine
// Uses @safepaste/core for all detection logic.

const { scanPrompt, normalizeText, PATTERNS } = require("../core");

/**
 * Analyze text for prompt injection patterns.
 *
 * Thin wrapper around @safepaste/core's scanPrompt that adds
 * API-specific fields (categories grouping, strictMode in meta).
 *
 * @param {string} text - The text to analyze
 * @param {object} [options] - Optional configuration
 * @param {boolean} [options.strictMode=false] - Lower thresholds for more sensitive detection
 * @returns {object} Analysis result
 */
function analyze(text, options = {}) {
  const result = scanPrompt(text, options);

  // API adds category grouping for backward compatibility
  const categories = {};
  for (const m of result.matches) {
    if (!categories[m.category]) categories[m.category] = [];
    categories[m.category].push({
      id: m.id,
      weight: m.weight,
      explanation: m.explanation,
      snippet: m.snippet
    });
  }

  return {
    flagged: result.flagged,
    risk: result.risk,
    score: result.score,
    threshold: result.threshold,
    matches: result.matches,
    categories,
    meta: {
      rawScore: result.meta.rawScore,
      dampened: result.meta.dampened,
      benignContext: result.meta.benignContext,
      ocrDetected: result.meta.ocrDetected,
      strictMode: !!options.strictMode,
      textLength: result.meta.textLength,
      patternCount: result.meta.patternCount
    }
  };
}

module.exports = { analyze, normalizeText, PATTERNS };
