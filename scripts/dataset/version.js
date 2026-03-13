#!/usr/bin/env node
// version.js — Create immutable versioned dataset snapshots
//
// Reads partitioned data from training/validation/benchmark/,
// enforces benchmark freeze, runs evaluation, and writes a versioned snapshot.
//
// Usage:
//   node scripts/dataset/version.js <version> [--force]

'use strict';

const path = require('path');
const fs = require('fs');
const { readAllJsonl, readJsonl, writeJsonl } = require('./lib/io');
const { contentHash } = require('./lib/dedup');
const { analyzeText, THRESHOLD } = require('./evaluate');
const { findLatestVersion } = require('./merge');

const PATTERNS = require('../../packages/shared/patterns');

const BASE_DIR = path.join(__dirname, '../../datasets/prompt-injection');
const TRAINING_DIR = path.join(BASE_DIR, 'training');
const VALIDATION_DIR = path.join(BASE_DIR, 'validation');
const BENCHMARK_DIR = path.join(BASE_DIR, 'benchmark');
const VERSIONS_DIR = path.join(BASE_DIR, 'versions');

function main() {
  const args = process.argv.slice(2);
  const flags = {};
  let version = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
      flags.force = true;
    } else if (!args[i].startsWith('--')) {
      version = args[i];
    }
  }

  if (!version) {
    console.error('Usage: node scripts/dataset/version.js <version> [--force]');
    console.error('  version  Semver format: X.Y.Z (e.g., 0.1.0)');
    process.exit(1);
  }

  // 1. Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Invalid version format: "${version}" (must be X.Y.Z)`);
    process.exit(1);
  }

  const versionDir = path.join(VERSIONS_DIR, `v${version}`);

  // 2. Check version doesn't already exist
  if (fs.existsSync(versionDir) && !flags.force) {
    console.error(`Version v${version} already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  // 3. Read partitioned data
  const training = readAllJsonl(TRAINING_DIR);
  const validation = readAllJsonl(VALIDATION_DIR);
  const benchmark = readAllJsonl(BENCHMARK_DIR);

  if (training.length === 0 && validation.length === 0 && benchmark.length === 0) {
    console.error('No records found in training/, validation/, benchmark/. Run merge.js first.');
    process.exit(1);
  }

  console.log(`Records: training=${training.length} validation=${validation.length} benchmark=${benchmark.length}`);

  // 4. Benchmark freeze enforcement
  const latestVersion = findLatestVersion(VERSIONS_DIR);
  if (latestVersion && latestVersion !== `v${version}`) {
    const prevBenchmarkPath = path.join(VERSIONS_DIR, latestVersion, 'benchmark.jsonl');
    if (fs.existsSync(prevBenchmarkPath)) {
      const prevBenchmark = readJsonl(prevBenchmarkPath);
      const currentBenchmarkById = new Map();
      for (const r of benchmark) {
        currentBenchmarkById.set(r.id, r);
      }

      let freezeViolations = 0;
      for (const prev of prevBenchmark) {
        const current = currentBenchmarkById.get(prev.id);
        if (!current) {
          console.error(`Benchmark freeze violation: record ${prev.id} missing from current benchmark`);
          freezeViolations++;
        } else if (contentHash(current.text) !== contentHash(prev.text)) {
          console.error(`Benchmark freeze violation: record ${prev.id} text changed`);
          freezeViolations++;
        }
      }

      if (freezeViolations > 0) {
        console.error(`\n${freezeViolations} benchmark freeze violation(s). Cannot create version.`);
        process.exit(1);
      }

      console.log(`Benchmark freeze check: ${prevBenchmark.length} records verified against ${latestVersion}`);
    }
  }

  // 5. Run evaluation on all records
  const allRecords = [...training, ...validation, ...benchmark];

  let tp = 0, tn = 0, fp = 0, fn = 0;
  const byLabel = { attack: 0, benign: 0, 'edge-case': 0 };
  const bySource = {};
  const byCategory = {};
  const undetectedClasses = [];

  for (const record of allRecords) {
    const result = analyzeText(record.text);

    byLabel[record.label] = (byLabel[record.label] || 0) + 1;
    bySource[record.source] = (bySource[record.source] || 0) + 1;
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;

    if (record.expected_flagged && result.flagged) tp++;
    else if (!record.expected_flagged && !result.flagged) tn++;
    else if (!record.expected_flagged && result.flagged) fp++;
    else fn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const fpRate = tn + fp > 0 ? fp / (tn + fp) : 0;
  const fnRate = tp + fn > 0 ? fn / (tp + fn) : 0;

  console.log(`\nEvaluation: P=${precision.toFixed(3)} R=${recall.toFixed(3)} FP=${fp} FN=${fn}`);

  // 6. Create version directory
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // 7. Write combined partition files
  writeJsonl(path.join(versionDir, 'training.jsonl'), training);
  writeJsonl(path.join(versionDir, 'validation.jsonl'), validation);
  writeJsonl(path.join(versionDir, 'benchmark.jsonl'), benchmark);

  // 8. Write metadata
  const metadata = {
    version,
    date: new Date().toISOString().split('T')[0],
    counts: {
      total: allRecords.length,
      by_partition: {
        training: training.length,
        validation: validation.length,
        benchmark: benchmark.length
      },
      by_label: byLabel,
      by_source: bySource,
      by_category: byCategory
    },
    evaluation: {
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      false_positive_rate: Math.round(fpRate * 1000) / 1000,
      false_negative_rate: Math.round(fnRate * 1000) / 1000,
      true_positives: tp,
      true_negatives: tn,
      false_positives: fp,
      false_negatives: fn
    },
    detection: {
      patterns_count: PATTERNS.length,
      threshold: THRESHOLD
    },
    previous_version: latestVersion || null
  };

  fs.writeFileSync(
    path.join(versionDir, 'dataset_version.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf8'
  );

  console.log(`\nVersion v${version} created at versions/v${version}/`);
  console.log(`  training.jsonl:        ${training.length} records`);
  console.log(`  validation.jsonl:      ${validation.length} records`);
  console.log(`  benchmark.jsonl:       ${benchmark.length} records`);
  console.log(`  dataset_version.json:  metadata`);
}

if (require.main === module) {
  main();
}
