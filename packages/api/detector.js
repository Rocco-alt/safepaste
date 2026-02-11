// detector.js — Prompt injection detection engine
// Uses shared modules from packages/shared/

const PATTERNS = require("../shared/patterns");
const {
  normalizeText,
  findMatches,
  computeScore,
  riskLevel,
  looksLikeOCR,
  isBenignContext,
  hasExfiltrationMatch,
  applyDampening
} = require("../shared/detect");

/**
 * Analyze text for prompt injection patterns.
 *
 * @param {string} text - The text to analyze
 * @param {object} [options] - Optional configuration
 * @param {boolean} [options.strictMode=false] - Lower thresholds for more sensitive detection
 * @returns {object} Analysis result
 */
function analyze(text, options = {}) {
  const input = typeof text === "string" ? text : "";
  const strict = !!options.strictMode;

  const normalized = normalizeText(input);
  const matches = findMatches(input, PATTERNS);

  const rawScore = computeScore(matches);
  const benign = isBenignContext(input);
  const exfiltrate = hasExfiltrationMatch(matches);
  const score = applyDampening(rawScore, benign, exfiltrate);

  const level = riskLevel(score);
  const ocrLike = looksLikeOCR(input);

  // Threshold for flagging
  const threshold = strict ? 25 : 35;
  const flagged = score >= threshold;

  // Group matches by category
  const categories = {};
  for (const m of matches) {
    if (!categories[m.category]) categories[m.category] = [];
    categories[m.category].push({
      id: m.id,
      weight: m.weight,
      explanation: m.explanation,
      snippet: m.snippet
    });
  }

  return {
    flagged,
    risk: level,
    score,
    threshold,
    matches: matches.map((m) => ({
      id: m.id,
      category: m.category,
      weight: m.weight,
      explanation: m.explanation,
      snippet: m.snippet
    })),
    categories,
    meta: {
      rawScore,
      dampened: benign && !exfiltrate,
      benignContext: benign,
      ocrDetected: ocrLike,
      strictMode: strict,
      textLength: input.length,
      patternCount: PATTERNS.length
    }
  };
}

module.exports = { analyze, normalizeText, PATTERNS };
