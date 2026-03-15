#!/usr/bin/env node
// analyze.js — Dataset anomaly analysis for pre-promotion review
//
// Detects anomalies in scraped datasets before promotion to curated:
// - Synthetic prompt generators (repeated templates)
// - Data poisoning (trigger phrases, encoded payloads)
// - Language mismatch (non-English content)
// - Outlier records (extreme length, low entropy)
//
// Uses deterministic statistics only — no ML.
//
// Usage:
//   node scripts/dataset/analyze.js <path>
//   node scripts/dataset/analyze.js <path> --json
//   node scripts/dataset/analyze.js <path> --top 30
//
// Pipeline position:
//   scraped/ → analyze.js → manual review → curated/
//
// This tool is diagnostic — it always exits 0.
// Run it after ingestion and before promoting records to curated/.
//
// Design note — optional category support:
//   Currently, external datasets without technique categories use
//   external_attack (detected:false) as a quarantine pseudo-category.
//   A cleaner alternative would allow category=null for scraped records:
//     - schema.js:68 — guard: category != null && !validCategories.includes(...)
//     - ingest.js:201 — guard: record.category != null && !KEYS.includes(...)
//     - evaluate.js:147 — guard: if (categoryDetected === null) route to
//       notCurrentlyDetected to prevent false-negative inflation
//   This is not implemented yet. See plan file for full analysis.

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');
const { escapeForDisplay } = require('./lib/safety');
const { detectLanguage, STOPWORDS } = require('./lib/lang-detect');

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function shannonEntropy(text) {
  if (!text || text.length === 0) return 0;
  const freq = {};
  for (const ch of text) freq[ch] = (freq[ch] || 0) + 1;
  const len = text.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 100) / 100;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(sorted) {
  return percentile(sorted, 50);
}

function mean(values) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Tokenize text into lowercase words, stripping punctuation.
 */
function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

// All stopwords combined for filtering top tokens/bigrams
const ALL_STOPWORDS = new Set();
for (const words of Object.values(STOPWORDS)) {
  for (const w of words) ALL_STOPWORDS.add(w);
}

/**
 * Normalize text for template detection.
 * Returns first 8 tokens after lowercasing and stripping punctuation.
 */
function templateKey(text) {
  const tokens = tokenize(text);
  return tokens.slice(0, 8).join(' ');
}

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

function analyzeLanguage(records) {
  const counts = {};
  for (const r of records) {
    const lang = detectLanguage(r.text);
    counts[lang] = (counts[lang] || 0) + 1;
  }
  return counts;
}

function analyzeTextLength(records) {
  const lengths = records.map(r => (r.text || '').length).sort((a, b) => a - b);
  const SHORT_THRESHOLD = 10;
  const LONG_THRESHOLD = 5000;

  const shortRecords = records.filter(r => (r.text || '').length < SHORT_THRESHOLD);
  const longRecords = records.filter(r => (r.text || '').length > LONG_THRESHOLD);

  return {
    min: lengths[0] || 0,
    max: lengths[lengths.length - 1] || 0,
    mean: mean(lengths),
    median: median(lengths),
    p5: percentile(lengths, 5),
    p95: percentile(lengths, 95),
    short: shortRecords.map(r => ({ id: r.id || '(no id)', length: (r.text || '').length, preview: escapeForDisplay(r.text, 40) })),
    long: longRecords.map(r => ({ id: r.id || '(no id)', length: (r.text || '').length, preview: escapeForDisplay(r.text, 40) }))
  };
}

function analyzeEntropy(records) {
  const LOW_THRESHOLD = 2.0;
  const HIGH_THRESHOLD = 5.5;

  const entropies = records.map(r => ({
    id: r.id || '(no id)',
    entropy: shannonEntropy(r.text || ''),
    preview: escapeForDisplay(r.text, 40)
  }));

  const values = entropies.map(e => e.entropy).sort((a, b) => a - b);
  const low = entropies.filter(e => e.entropy < LOW_THRESHOLD && (records.find(r => (r.id || '(no id)') === e.id)?.text || '').length > 0);
  const high = entropies.filter(e => e.entropy > HIGH_THRESHOLD);

  return {
    min: values[0] || 0,
    max: values[values.length - 1] || 0,
    mean: mean(values),
    low,
    high
  };
}

function analyzeTokens(records, topN) {
  const counts = {};
  for (const r of records) {
    const tokens = tokenize(r.text || '');
    for (const t of tokens) {
      if (t.length < 2 || ALL_STOPWORDS.has(t)) continue;
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([token, count]) => ({ token, count }));
}

function analyzeBigrams(records, topN) {
  const counts = {};
  for (const r of records) {
    const tokens = tokenize(r.text || '');
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = tokens[i] + ' ' + tokens[i + 1];
      counts[bigram] = (counts[bigram] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([bigram, count]) => ({ bigram, count }));
}

function analyzeTemplates(records) {
  const groups = {};
  for (const r of records) {
    const key = templateKey(r.text || '');
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.id || '(no id)');
  }

  return Object.entries(groups)
    .filter(([, ids]) => ids.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, ids]) => ({ template: key, count: ids.length, ids: ids.slice(0, 5) }));
}

function analyzeEncoding(records) {
  const BASE64_RE = /[A-Za-z0-9+/]{20,}={0,2}/;
  const HEX_RE = /[0-9a-f]{20,}/i;
  const URL_ENCODED_RE = /%[0-9A-Fa-f]{2}/;

  const base64 = [];
  const hex = [];
  const urlEncoded = [];

  for (const r of records) {
    const text = r.text || '';
    const id = r.id || '(no id)';
    if (BASE64_RE.test(text)) base64.push(id);
    if (HEX_RE.test(text)) hex.push(id);
    if (URL_ENCODED_RE.test(text)) urlEncoded.push(id);
  }

  return { base64, hex, urlEncoded };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printHuman(report) {
  console.log('Dataset Analysis');
  console.log('='.repeat(50));
  console.log(`Total: ${report.summary.total} records (${report.summary.by_label.attack || 0} attack, ${report.summary.by_label.benign || 0} benign, ${report.summary.by_label['edge-case'] || 0} edge-case)`);
  console.log('');

  // Language
  console.log('Language distribution:');
  const langEntries = Object.entries(report.language)
    .sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of langEntries) {
    const pct = ((count / report.summary.total) * 100).toFixed(1);
    console.log(`  ${lang.padEnd(28)} ${String(count).padStart(4)} (${pct}%)`);
  }
  console.log('');

  // Text length
  const tl = report.text_length;
  console.log('Text length:');
  console.log(`  Min: ${tl.min}  Max: ${tl.max}  Mean: ${tl.mean}  Median: ${tl.median}`);
  console.log(`  P5: ${tl.p5}  P95: ${tl.p95}`);
  console.log(`  Short (<10 chars): ${tl.short.length} records`);
  for (const r of tl.short.slice(0, 5)) {
    console.log(`    ${r.id}: ${r.preview}`);
  }
  console.log(`  Long (>5000 chars): ${tl.long.length} records`);
  for (const r of tl.long.slice(0, 5)) {
    console.log(`    ${r.id}: (${r.length} chars) ${r.preview}`);
  }
  console.log('');

  // Entropy
  const ent = report.entropy;
  console.log('Character entropy:');
  console.log(`  Mean: ${ent.mean}  Min: ${ent.min}  Max: ${ent.max}`);
  console.log(`  Low entropy (<2.0): ${ent.low.length} records`);
  for (const r of ent.low.slice(0, 5)) {
    console.log(`    ${r.id}: ${r.preview} (${r.entropy})`);
  }
  console.log(`  High entropy (>5.5): ${ent.high.length} records`);
  for (const r of ent.high.slice(0, 5)) {
    console.log(`    ${r.id}: ${r.preview} (${r.entropy})`);
  }
  console.log('');

  // Top tokens
  console.log('Top tokens (excluding stopwords):');
  for (const { token, count } of report.top_tokens) {
    console.log(`  ${token.padEnd(28)} ${String(count).padStart(4)}`);
  }
  console.log('');

  // Top bigrams
  console.log('Top bigrams:');
  for (const { bigram, count } of report.top_bigrams) {
    console.log(`  ${bigram.padEnd(28)} ${String(count).padStart(4)}`);
  }
  console.log('');

  // Templates
  console.log(`Repeated templates (3+ records sharing first 8 tokens): ${report.templates.length} groups`);
  for (const t of report.templates.slice(0, 20)) {
    const idList = t.ids.join(', ') + (t.count > t.ids.length ? ', ...' : '');
    console.log(`  "${escapeForDisplay(t.template, 50)}" — ${t.count} records [${idList}]`);
  }
  console.log('');

  // Encoding
  const enc = report.encoding;
  console.log('Encoding indicators:');
  console.log(`  Base64 patterns:    ${enc.base64.length} records`);
  console.log(`  Hex strings:        ${enc.hex.length} records`);
  console.log(`  URL-encoded:        ${enc.urlEncoded.length} records`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const flags = {};
  const paths = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      flags.json = true;
    } else if (args[i] === '--top' && args[i + 1]) {
      flags.top = parseInt(args[++i], 10);
      if (isNaN(flags.top) || flags.top < 1) {
        console.error('Error: --top must be a positive integer');
        process.exit(1);
      }
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node scripts/dataset/analyze.js <path> [--json] [--top N]');
      console.log('');
      console.log('Analyze dataset files for anomalies before promotion to curated.');
      console.log('');
      console.log('Options:');
      console.log('  --json     Output as JSON');
      console.log('  --top N    Number of top tokens/bigrams to show (default: 20)');
      console.log('  --help     Show this help');
      process.exit(0);
    } else if (!args[i].startsWith('--')) {
      paths.push(args[i]);
    }
  }

  if (paths.length === 0) {
    console.error('Usage: node scripts/dataset/analyze.js <path> [--json] [--top N]');
    process.exit(1);
  }

  const topN = flags.top || 20;

  // Collect records
  const inputPath = path.resolve(paths[0]);
  let files;
  if (fs.statSync(inputPath).isDirectory()) {
    files = walkJsonlFiles(inputPath);
  } else {
    files = [inputPath];
  }

  if (files.length === 0) {
    console.error('No .jsonl files found');
    process.exit(1);
  }

  const records = [];
  for (const file of files) {
    records.push(...readJsonl(file));
  }

  if (records.length === 0) {
    console.error('No records found');
    process.exit(1);
  }

  // Summary
  const byLabel = {};
  const byCategory = {};
  for (const r of records) {
    const label = r.label || '(unset)';
    byLabel[label] = (byLabel[label] || 0) + 1;
    const cat = r.category || '(unset)';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  // Build report
  const report = {
    summary: {
      total: records.length,
      by_label: byLabel,
      by_category: byCategory
    },
    language: analyzeLanguage(records),
    text_length: analyzeTextLength(records),
    entropy: analyzeEntropy(records),
    top_tokens: analyzeTokens(records, topN),
    top_bigrams: analyzeBigrams(records, topN),
    templates: analyzeTemplates(records),
    encoding: analyzeEncoding(records)
  };

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  shannonEntropy,
  templateKey,
  analyzeLanguage,
  analyzeTextLength,
  analyzeEntropy,
  analyzeTokens,
  analyzeBigrams,
  analyzeTemplates,
  analyzeEncoding
};
