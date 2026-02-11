// detector.js — Prompt injection detection engine
// Standalone module (no browser dependencies)

const PATTERNS = require("./patterns");

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .trim()
    .toLowerCase();
}

function findMatches(text) {
  if (typeof text !== "string") return [];
  const matches = [];

  for (const pattern of PATTERNS) {
    try {
      if (!(pattern.match instanceof RegExp)) continue;
      const m = text.match(pattern.match);
      if (m && m[0]) {
        matches.push({
          id: pattern.id,
          weight: pattern.weight,
          category: pattern.category,
          explanation: pattern.explanation,
          snippet: m[0]
        });
      }
    } catch {
      // skip bad regex
    }
  }

  return matches;
}

function computeScore(matches) {
  const total = matches.reduce((sum, m) => sum + (m.weight || 0), 0);
  return Math.min(100, total);
}

function riskLevel(score) {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function looksLikeOCR(text) {
  if (typeof text !== "string" || !text) return false;

  const lineBreaks = (text.match(/\n/g) || []).length;
  const lineBreakRatio = text.length > 0 ? lineBreaks / text.length : 0;
  const weirdSpacing = /[a-z]\s{2,}[a-z]/i.test(text);
  const manyPipesOrBullets = (text.match(/[|•·]/g) || []).length >= 8;
  const mixedScripts = /[a-z].*[\u0400-\u04FF]|[\u0400-\u04FF].*[a-z]/i.test(text);

  return lineBreakRatio > 0.02 || weirdSpacing || manyPipesOrBullets || mixedScripts;
}

function isBenignContext(text) {
  if (typeof text !== "string" || !text) return false;

  const educational =
    /\b(for example|example:|e\.g\.|such as|demo|demonstration|explanation|in this article|in this post|research|paper|study|documentation|docs)\b/i;
  const metaPromptInjection = /\bprompt injection\b/i;
  const hasQuotes = /["""''']/.test(text);
  const hasCodeFence = /```/.test(text);
  const hasBlockQuote = /^\s*>/m.test(text);
  const framing =
    /\b(this is|here is|an example of|a common|a typical)\b.{0,40}\b(prompt injection|attack|jailbreak)\b/i;

  return (
    educational.test(text) ||
    metaPromptInjection.test(text) ||
    framing.test(text) ||
    ((hasQuotes || hasCodeFence || hasBlockQuote) && metaPromptInjection.test(text))
  );
}

function hasExfiltrationMatch(matches) {
  return matches.some((m) => m.id.startsWith("exfiltrate."));
}

function applyDampening(score, benign, hasExfiltrate) {
  if (!benign || hasExfiltrate) return score;
  return Math.max(0, Math.min(100, Math.round(score * 0.75)));
}

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
  const matches = findMatches(input);

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
