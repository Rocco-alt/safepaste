#!/usr/bin/env node
// evaluate.js — Detection engine evaluation
//
// Runs SafePaste's detection engine against dataset examples and computes
// precision, recall, false positive/negative rates, and per-category coverage.
//
// Usage:
//   node scripts/dataset/evaluate.js <path>
//   node scripts/dataset/evaluate.js <path> --partition benchmark
//   node scripts/dataset/evaluate.js <path> --json
//
// The detection engine is read-only: pure functions that return data.
// Dataset text is NEVER executed — only matched against regex patterns.

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');
const { isDetected, PROMPT_INJECTION_CATEGORIES } = require('./lib/categories');
const { escapeForDisplay } = require('./lib/safety');

// Import the detection engine — same pure functions used by the API
const PATTERNS = require('../../packages/shared/patterns');
const {
  normalizeText,
  findMatches,
  computeScore,
  isBenignContext,
  hasExfiltrationMatch,
  applyDampening
} = require('../../packages/shared/detect');

const THRESHOLD = 35;

/**
 * Run detection engine on a single text (mirrors packages/api/detector.js analyze()).
 */
function analyzeText(text) {
  const input = typeof text === 'string' ? text : '';
  const matches = findMatches(input, PATTERNS);
  const rawScore = computeScore(matches);
  const benign = isBenignContext(input);
  const exfiltrate = hasExfiltrationMatch(matches);
  const score = applyDampening(rawScore, benign, exfiltrate);
  const flagged = score >= THRESHOLD;

  return {
    flagged,
    score,
    rawScore,
    matches: matches.map(m => m.id),
    dampened: benign && !exfiltrate
  };
}

function main() {
  const args = process.argv.slice(2);
  const flags = {};
  const paths = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--partition' && args[i + 1]) {
      flags.partition = args[++i];
    } else if (args[i] === '--group-by' && args[i + 1]) {
      flags.groupBy = args[++i];
    } else if (args[i] === '--json') {
      flags.json = true;
    } else if (!args[i].startsWith('--')) {
      paths.push(args[i]);
    }
  }

  if (paths.length === 0) {
    console.error('Usage: node scripts/dataset/evaluate.js <path> [--partition training|validation|benchmark] [--json]');
    process.exit(1);
  }

  // Collect records
  const inputPath = path.resolve(paths[0]);
  let files;
  if (fs.statSync(inputPath).isDirectory()) {
    files = walkJsonlFiles(inputPath);
  } else {
    files = [inputPath];
  }

  let records = [];
  for (const file of files) {
    records.push(...readJsonl(file));
  }

  // Filter by partition if requested
  if (flags.partition) {
    records = records.filter(r => r.partition === flags.partition);
    if (records.length === 0) {
      console.error(`No records found with partition: ${flags.partition}`);
      process.exit(1);
    }
  }

  // Run evaluation
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let notCurrentlyDetected = 0;

  const falsePositiveList = [];
  const falseNegativeList = [];
  const coverageByCategory = {};
  const scoreDistribution = {
    '0-10': 0, '11-20': 0, '21-30': 0, '31-50': 0, '51-70': 0, '71-100': 0
  };
  const perRecordResults = [];

  for (const record of records) {
    const result = analyzeText(record.text);
    perRecordResults.push({ record, result });

    // Score distribution
    if (result.score <= 10) scoreDistribution['0-10']++;
    else if (result.score <= 20) scoreDistribution['11-20']++;
    else if (result.score <= 30) scoreDistribution['21-30']++;
    else if (result.score <= 50) scoreDistribution['31-50']++;
    else if (result.score <= 70) scoreDistribution['51-70']++;
    else scoreDistribution['71-100']++;

    // Track per-category coverage
    const cat = record.category || 'unknown';
    if (!coverageByCategory[cat]) {
      coverageByCategory[cat] = { total: 0, detected: 0, expected_detected: 0 };
    }
    coverageByCategory[cat].total++;
    if (result.flagged) coverageByCategory[cat].detected++;
    if (record.expected_flagged) coverageByCategory[cat].expected_detected++;

    // Check if this category is currently detected by the engine
    const categoryDetected = isDetected(cat);

    if (record.expected_flagged && !result.flagged) {
      // Expected to be flagged, but wasn't
      if (categoryDetected === false) {
        // Category has no patterns — this is a detection gap, not a false negative
        notCurrentlyDetected++;
      } else {
        falseNegatives++;
        falseNegativeList.push({
          id: record.id || '(no id)',
          category: cat,
          score: result.score,
          text: escapeForDisplay(record.text, 80)
        });
      }
    } else if (!record.expected_flagged && result.flagged) {
      // Not expected to be flagged, but was
      falsePositives++;
      falsePositiveList.push({
        id: record.id || '(no id)',
        category: cat,
        score: result.score,
        text: escapeForDisplay(record.text, 80)
      });
    } else if (record.expected_flagged && result.flagged) {
      truePositives++;
    } else {
      trueNegatives++;
    }
  }

  // Compute metrics
  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 1;
  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 1;
  const fpRate = trueNegatives + falsePositives > 0
    ? falsePositives / (trueNegatives + falsePositives)
    : 0;
  const fnRate = truePositives + falseNegatives > 0
    ? falseNegatives / (truePositives + falseNegatives)
    : 0;

  // Per-category recall
  const categoryCoverage = {};
  for (const [cat, data] of Object.entries(coverageByCategory)) {
    const catInfo = { total: data.total, detected: data.detected };
    if (data.expected_detected > 0) {
      catInfo.recall = data.detected / data.expected_detected;
    } else {
      catInfo.recall = null;
    }
    const catDetected = isDetected(cat);
    if (catDetected === false) {
      catInfo.note = 'no patterns exist';
    }
    categoryCoverage[cat] = catInfo;
  }

  // Undetected attack classes
  const undetectedClasses = Object.entries(PROMPT_INJECTION_CATEGORIES)
    .filter(([key, val]) => val.detected === false)
    .map(([key]) => key);

  const report = {
    total_examples: records.length,
    true_positives: truePositives,
    true_negatives: trueNegatives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    not_currently_detected: notCurrentlyDetected,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    false_positive_rate: Math.round(fpRate * 1000) / 1000,
    false_negative_rate: Math.round(fnRate * 1000) / 1000,
    coverage_by_category: categoryCoverage,
    undetected_attack_classes: undetectedClasses,
    score_distribution: scoreDistribution,
    patterns_count: PATTERNS.length,
    threshold: THRESHOLD
  };

  if (flags.partition) {
    report.partition = flags.partition;
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Human-readable output
  console.log('SafePaste Detection Engine Evaluation');
  console.log('='.repeat(50));
  if (flags.partition) {
    console.log(`Partition: ${flags.partition}`);
  }
  console.log(`Total examples: ${report.total_examples}`);
  console.log(`Patterns: ${report.patterns_count} | Threshold: ${report.threshold}`);
  console.log('');

  console.log('Results:');
  console.log(`  True positives:        ${truePositives}`);
  console.log(`  True negatives:        ${trueNegatives}`);
  console.log(`  False positives:       ${falsePositives}`);
  console.log(`  False negatives:       ${falseNegatives}`);
  console.log(`  Not currently detected: ${notCurrentlyDetected}`);
  console.log('');

  console.log('Metrics:');
  console.log(`  Precision:          ${report.precision}`);
  console.log(`  Recall:             ${report.recall}`);
  console.log(`  False positive rate: ${report.false_positive_rate}`);
  console.log(`  False negative rate: ${report.false_negative_rate}`);
  console.log('');

  console.log('Score distribution:');
  for (const [range, count] of Object.entries(scoreDistribution)) {
    const bar = '#'.repeat(count);
    console.log(`  ${range.padEnd(6)} ${String(count).padStart(4)} ${bar}`);
  }
  console.log('');

  console.log('Coverage by category:');
  for (const [cat, data] of Object.entries(categoryCoverage)) {
    const recallStr = data.recall !== null ? `recall=${data.recall.toFixed(2)}` : 'n/a';
    const note = data.note ? ` (${data.note})` : '';
    console.log(`  ${cat.padEnd(28)} total=${data.total} detected=${data.detected} ${recallStr}${note}`);
  }

  if (undetectedClasses.length > 0) {
    console.log('');
    console.log(`Undetected attack classes (${undetectedClasses.length}):`);
    for (const cls of undetectedClasses) {
      console.log(`  - ${cls}`);
    }
  }

  if (falsePositiveList.length > 0) {
    console.log('');
    console.log('False positives:');
    for (const fp of falsePositiveList) {
      console.log(`  [${fp.id}] ${fp.category} score=${fp.score}: ${fp.text}`);
    }
  }

  if (falseNegativeList.length > 0) {
    console.log('');
    console.log('False negatives:');
    for (const fn of falseNegativeList) {
      console.log(`  [${fn.id}] ${fn.category} score=${fn.score}: ${fn.text}`);
    }
  }

  // --group-by: per-group metrics
  if (flags.groupBy) {
    const groups = {};
    for (const { record, result } of perRecordResults) {
      const key = record[flags.groupBy] || '(none)';
      if (!groups[key]) groups[key] = { tp: 0, tn: 0, fp: 0, fn: 0 };
      const g = groups[key];
      if (record.expected_flagged && result.flagged) g.tp++;
      else if (!record.expected_flagged && !result.flagged) g.tn++;
      else if (!record.expected_flagged && result.flagged) g.fp++;
      else g.fn++;
    }

    if (flags.json) {
      const groupReport = {};
      for (const [key, g] of Object.entries(groups)) {
        const p = g.tp + g.fp > 0 ? g.tp / (g.tp + g.fp) : 1;
        const r = g.tp + g.fn > 0 ? g.tp / (g.tp + g.fn) : 1;
        groupReport[key] = { ...g, precision: Math.round(p * 1000) / 1000, recall: Math.round(r * 1000) / 1000 };
      }
      console.log(JSON.stringify({ group_by: flags.groupBy, groups: groupReport }, null, 2));
    } else {
      console.log('');
      console.log(`Group by: ${flags.groupBy}`);
      console.log(`${'Group'.padEnd(28)} ${'TP'.padStart(4)} ${'TN'.padStart(4)} ${'FP'.padStart(4)} ${'FN'.padStart(4)}  Prec  Recall`);
      console.log('-'.repeat(70));
      for (const [key, g] of Object.entries(groups).sort()) {
        const p = g.tp + g.fp > 0 ? g.tp / (g.tp + g.fp) : 1;
        const r = g.tp + g.fn > 0 ? g.tp / (g.tp + g.fn) : 1;
        console.log(`${key.padEnd(28)} ${String(g.tp).padStart(4)} ${String(g.tn).padStart(4)} ${String(g.fp).padStart(4)} ${String(g.fn).padStart(4)}  ${p.toFixed(3)}  ${r.toFixed(3)}`);
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeText, THRESHOLD };
