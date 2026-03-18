/**
 * @module @safepaste/core/detect
 *
 * Core detection functions for prompt injection analysis.
 * Pure functions with no browser or Node-specific dependencies.
 * Both the API and extension are built from this file.
 *
 * To change detection logic, edit HERE, then run: node scripts/build-extension.js
 */

/**
 * Normalize text for consistent pattern matching.
 * Applies NFKC Unicode normalization, removes invisible/formatting characters
 * (zero-width, bidi controls, soft hyphens), collapses inter-character separators
 * (space/dot/dash/underscore between 3+ single letters), collapses whitespace,
 * trims, and lowercases.
 *
 * @param {string} text - Raw input text
 * @returns {string} Normalized lowercase text, or empty string if input is not a string
 */
function normalizeText(text) {
  if (typeof text !== "string") return "";
  var t = text
    .normalize("NFKC")
    // Remove invisible/formatting chars (zero-width, bidi, soft hyphens, etc.)
    // Excludes U+202F (NFKC handles it) and U+2028/2029 (handled as line breaks below)
    .replace(/[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g, "")
    // Collapse newlines + Unicode line/paragraph separators to space
    .replace(/[\r\n\u2028\u2029]+/g, " ");

  // Collapse inter-character separators (3+ single-letter runs)
  // Must run BEFORE whitespace collapse to preserve double-space word boundaries
  // Space: lookbehind prevents consuming letters from adjacent words (apostrophe fix)
  t = t
    .replace(/(?:^|(?<=\s))[a-zA-Z]( [a-zA-Z]){2,}\b/g, function(m) { return m.replace(/ /g, ""); })
    .replace(/\b[a-zA-Z](\.[a-zA-Z]){2,}\b/g, function(m) { return m.replace(/\./g, ""); })
    .replace(/\b[a-zA-Z](-[a-zA-Z]){2,}\b/g, function(m) { return m.replace(/-/g, ""); })
    .replace(/\b[a-zA-Z](_[a-zA-Z]){2,}\b/g, function(m) { return m.replace(/_/g, ""); });

  return t
    .replace(/[ \t]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Regex for detecting negation words at the end of a text prefix.
 * Used to suppress false positives on negatable patterns like "don't forget...".
 * @type {RegExp}
 */
var NEGATION_PREFIX = /\b(?:don'?t|do\s+not|never|not\s+to|shouldn'?t|won'?t|cannot|can'?t)\s*$/i;

/**
 * Check whether a match is preceded by a negation word within 20 characters.
 * Suppresses negatable patterns (e.g., "don't forget all instructions" is
 * a reinforcement, not an override).
 *
 * @param {string} text - The text being searched (normalized)
 * @param {number} matchIndex - Start index of the regex match
 * @returns {boolean} True if a negation word precedes the match within 20 chars
 */
function isNegated(text, matchIndex) {
  var prefix = text.substring(Math.max(0, matchIndex - 20), matchIndex);
  return NEGATION_PREFIX.test(prefix);
}

/**
 * Find all matching detection patterns in normalized text.
 *
 * @param {string} text - Normalized text (output of normalizeText)
 * @param {import('./patterns').Pattern[]} patterns - Array of pattern objects to test
 * @returns {Array<{id: string, weight: number, category: string, explanation: string, snippet: string}>}
 *   Array of match objects for each triggered pattern. Empty array if no matches.
 */
function findMatches(text, patterns) {
  if (typeof text !== "string") return [];
  if (!Array.isArray(patterns)) return [];

  var matches = [];

  for (var i = 0; i < patterns.length; i++) {
    try {
      var p = patterns[i];
      if (!(p.match instanceof RegExp)) continue;

      var m = text.match(p.match);
      if (m && m[0]) {
        if (p.negatable && isNegated(text, m.index)) continue;
        matches.push({
          id: String(p.id || ""),
          weight: Number(p.weight) || 0,
          category: String(p.category || ""),
          explanation: String(p.explanation || ""),
          snippet: String(m[0] || "")
        });
      }
    } catch (err) {
      // skip bad regex
    }
  }

  return matches;
}

/**
 * Compute aggregate risk score from pattern matches.
 * Sums all match weights and caps at 100.
 *
 * @param {Array<{weight: number}>} matches - Array of match objects from findMatches
 * @returns {number} Risk score between 0 and 100 (inclusive)
 */
function computeScore(matches) {
  var list = Array.isArray(matches) ? matches : [];
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    total += Number(list[i].weight) || 0;
  }
  return Math.min(100, total);
}

/**
 * Convert a numeric score to a risk level label.
 *
 * @param {number} score - Risk score (0-100)
 * @returns {"high" | "medium" | "low"} Risk level: >=60 high, >=30 medium, <30 low
 */
function riskLevel(score) {
  var n = Number(score) || 0;
  if (n >= 60) return "high";
  if (n >= 30) return "medium";
  return "low";
}

/**
 * Detect whether text appears to be OCR output.
 * Checks for high line-break ratios, irregular spacing, pipe/bullet characters,
 * and mixed scripts (Latin + Cyrillic) that indicate OCR artifacts.
 *
 * @param {string} text - Raw input text (not normalized — spacing matters)
 * @returns {boolean} True if text has OCR-like characteristics
 */
function looksLikeOCR(text) {
  if (typeof text !== "string" || !text) return false;

  var lineBreaks = (text.match(/\n/g) || []).length;
  var lineBreakRatio = text.length > 0 ? lineBreaks / text.length : 0;
  var weirdSpacing = /[a-z]\s{2,}[a-z]/i.test(text);
  var manyPipesOrBullets = (text.match(/[|•·]/g) || []).length >= 8;
  var mixedScripts = /[a-z].*[\u0400-\u04FF]|[\u0400-\u04FF].*[a-z]/i.test(text);

  return lineBreakRatio > 0.02 || weirdSpacing || manyPipesOrBullets || mixedScripts;
}

/**
 * Detect whether text appears in an educational or benign context.
 * Checks for educational markers, meta-references to "prompt injection",
 * and framing patterns that indicate discussion of attacks rather than
 * actual attacks.
 *
 * @param {string} text - Raw input text (not normalized — case and formatting matter)
 * @returns {boolean} True if text appears educational/meta rather than an active attack
 */
function isBenignContext(text) {
  if (typeof text !== "string" || !text) return false;

  var educational =
    /\b(for example|example:|e\.g\.|such as|demo|demonstration|explanation|in this article|in this post|research|paper|study|documentation|docs)\b/i;
  var metaPromptInjection = /\bprompt injection\b/i;
  var hasQuotes = /["""''']/.test(text);
  var hasCodeFence = /```/.test(text);
  var hasBlockQuote = /^\s*>/m.test(text);
  var framing =
    /\b(this is|here is|an example of|a common|a typical)\b.{0,40}\b(prompt injection|attack|jailbreak)\b/i;

  return (
    educational.test(text) ||
    metaPromptInjection.test(text) ||
    framing.test(text) ||
    ((hasQuotes || hasCodeFence || hasBlockQuote) && metaPromptInjection.test(text))
  );
}

/**
 * Detect social engineering authority framing in text.
 * When present, dampening should be skipped even if the text
 * also contains benign/educational markers (e.g., "documentation").
 *
 * Separated from isBenignContext to maintain pipeline separation:
 * isBenignContext classifies text tone; this classifies adversarial intent.
 *
 * @param {string} text - Raw input text
 * @returns {boolean} True if social engineering authority markers are present
 */
function hasSocialEngineering(text) {
  if (typeof text !== "string" || !text) return false;
  return /\b(?:my\s+(?:supervisor|manager|director|boss)|employee\s+(?:id|number|badge)|compliance\s+officer|(?:authorized|instructed)\s+by)\b/i.test(text);
}

/**
 * Check whether any matches are data exfiltration patterns.
 * Exfiltration matches are never dampened, even in benign contexts.
 *
 * @param {Array<{id: string}>} matches - Array of match objects from findMatches
 * @returns {boolean} True if any match ID starts with "exfiltrate."
 */
function hasExfiltrationMatch(matches) {
  var list = Array.isArray(matches) ? matches : [];
  for (var i = 0; i < list.length; i++) {
    if (typeof list[i].id === "string" && list[i].id.indexOf("exfiltrate.") === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Apply score dampening for benign/educational contexts.
 * Reduces score by 15% (multiplier 0.85) when text appears benign,
 * unless exfiltration patterns are present (never dampened).
 *
 * @param {number} score - Raw risk score (0-100)
 * @param {boolean} benign - Whether isBenignContext returned true
 * @param {boolean} hasExfiltrate - Whether hasExfiltrationMatch returned true
 * @returns {number} Dampened score (0-100), or original score if not dampened
 */
function applyDampening(score, benign, hasExfiltrate) {
  var s = Number(score) || 0;
  if (!benign) return s;
  if (hasExfiltrate) return s; // never dampen explicit exfiltration
  return Math.max(0, Math.min(100, Math.round(s * 0.85)));
}

module.exports = {
  normalizeText: normalizeText,
  isNegated: isNegated,
  findMatches: findMatches,
  computeScore: computeScore,
  riskLevel: riskLevel,
  looksLikeOCR: looksLikeOCR,
  isBenignContext: isBenignContext,
  hasSocialEngineering: hasSocialEngineering,
  hasExfiltrationMatch: hasExfiltrationMatch,
  applyDampening: applyDampening
};
