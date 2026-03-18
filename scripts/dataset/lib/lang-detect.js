// lang-detect.js — Lightweight language detection via stopword frequency
//
// Deterministic heuristic: scores text against stopword sets for common
// languages, assigns whichever language has the highest match count.
// No ML, no external dependencies.

'use strict';

const STOPWORDS = {
  english: new Set([
    'the', 'is', 'and', 'of', 'to', 'in', 'for', 'that', 'this', 'with',
    'are', 'was', 'not', 'but', 'have', 'from', 'can', 'you', 'your', 'it'
  ]),
  german: new Set([
    'der', 'die', 'das', 'ist', 'und', 'ein', 'eine', 'nicht', 'auf', 'mit',
    'für', 'von', 'wie', 'den', 'des', 'auch', 'sich', 'noch', 'nach', 'aus'
  ]),
  french: new Set([
    'le', 'la', 'les', 'de', 'du', 'des', 'est', 'un', 'une', 'et',
    'en', 'que', 'qui', 'pas', 'pour', 'dans', 'sur', 'avec', 'sont', 'par'
  ]),
  spanish: new Set([
    'el', 'la', 'los', 'las', 'de', 'en', 'un', 'una', 'es', 'que',
    'por', 'con', 'del', 'para', 'como', 'pero', 'más', 'ser', 'sus', 'hay'
  ])
};

const MIN_STOPWORD_HITS = 3;

/**
 * Detect the most likely language of a text string.
 *
 * Tokenizes by whitespace, lowercases, and counts matches against each
 * language's stopword set. Whichever language has the most hits wins.
 * Records with fewer than MIN_STOPWORD_HITS from any language are
 * classified as 'other/short'.
 *
 * @param {string} text - Raw text to classify
 * @returns {string} Language key ('english', 'german', etc.) or 'other/short'
 */
function detectLanguage(text) {
  if (typeof text !== 'string' || text.length === 0) return 'other/short';

  const tokens = text.toLowerCase().split(/\s+/);
  let bestLang = 'other/short';
  let bestCount = MIN_STOPWORD_HITS - 1;

  for (const [lang, stopwords] of Object.entries(STOPWORDS)) {
    let count = 0;
    for (const token of tokens) {
      if (stopwords.has(token)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestLang = lang;
    }
  }

  return bestLang;
}

module.exports = { detectLanguage, STOPWORDS, MIN_STOPWORD_HITS };
