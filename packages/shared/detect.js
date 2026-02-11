// detect.js — Core detection functions (single source of truth)
//
// Pure functions with no browser or Node-specific dependencies.
// Both the API and extension are built from this file.
// To change detection logic, edit HERE, then run: node scripts/build-extension.js

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

function computeScore(matches) {
  var list = Array.isArray(matches) ? matches : [];
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    total += Number(list[i].weight) || 0;
  }
  return Math.min(100, total);
}

function riskLevel(score) {
  var n = Number(score) || 0;
  if (n >= 60) return "high";
  if (n >= 30) return "medium";
  return "low";
}

function looksLikeOCR(text) {
  if (typeof text !== "string" || !text) return false;

  var lineBreaks = (text.match(/\n/g) || []).length;
  var lineBreakRatio = text.length > 0 ? lineBreaks / text.length : 0;
  var weirdSpacing = /[a-z]\s{2,}[a-z]/i.test(text);
  var manyPipesOrBullets = (text.match(/[|•·]/g) || []).length >= 8;
  var mixedScripts = /[a-z].*[\u0400-\u04FF]|[\u0400-\u04FF].*[a-z]/i.test(text);

  return lineBreakRatio > 0.02 || weirdSpacing || manyPipesOrBullets || mixedScripts;
}

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

function hasExfiltrationMatch(matches) {
  var list = Array.isArray(matches) ? matches : [];
  for (var i = 0; i < list.length; i++) {
    if (typeof list[i].id === "string" && list[i].id.indexOf("exfiltrate.") === 0) {
      return true;
    }
  }
  return false;
}

function applyDampening(score, benign, hasExfiltrate) {
  var s = Number(score) || 0;
  if (!benign) return s;
  if (hasExfiltrate) return s; // never dampen explicit exfiltration
  return Math.max(0, Math.min(100, Math.round(s * 0.75)));
}

module.exports = {
  normalizeText: normalizeText,
  findMatches: findMatches,
  computeScore: computeScore,
  riskLevel: riskLevel,
  looksLikeOCR: looksLikeOCR,
  isBenignContext: isBenignContext,
  hasExfiltrationMatch: hasExfiltrationMatch,
  applyDampening: applyDampening
};
