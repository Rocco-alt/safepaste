#!/usr/bin/env node
// merge.js — Combine, deduplicate, and partition dataset sources
//
// Reads curated/ first, then generated/ (order matters — curated wins in dedup).
// Validates, deduplicates, assigns partitions, and writes to training/validation/benchmark/.
//
// Usage:
//   node scripts/dataset/merge.js [--include-scraped] [--include-telemetry] [--dry-run]

'use strict';

const path = require('path');
const fs = require('fs');
const { readAllJsonl, writeJsonl, walkJsonlFiles } = require('./lib/io');
const { validateRecord, validateIdUniqueness } = require('./lib/schema');
const { deduplicate, contentHash } = require('./lib/dedup');
const { assignPartitions, splitByPartition, partitionSummary } = require('./lib/partition');

const BASE_DIR = path.join(__dirname, '../../datasets/prompt-injection');
const CURATED_DIR = path.join(BASE_DIR, 'curated');
const GENERATED_DIR = path.join(BASE_DIR, 'generated');
const SCRAPED_DIR = path.join(BASE_DIR, 'scraped');
const TELEMETRY_DIR = path.join(BASE_DIR, 'telemetry');
const TRAINING_DIR = path.join(BASE_DIR, 'training');
const VALIDATION_DIR = path.join(BASE_DIR, 'validation');
const BENCHMARK_DIR = path.join(BASE_DIR, 'benchmark');
const VERSIONS_DIR = path.join(BASE_DIR, 'versions');

function main() {
  const args = process.argv.slice(2);
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--include-scraped') flags.includeScraped = true;
    else if (args[i] === '--include-telemetry') flags.includeTelemetry = true;
    else if (args[i] === '--dry-run') flags.dryRun = true;
  }

  // 1. Read sources in order: curated first (first-in-wins for dedup)
  //    IMPORTANT: curated records must be read before generated so they survive dedup.
  const allRecords = [];
  const sourceCounts = {};

  const curatedRecords = readAllJsonl(CURATED_DIR);
  allRecords.push(...curatedRecords);
  sourceCounts.curated = curatedRecords.length;

  const generatedRecords = readAllJsonl(GENERATED_DIR);
  allRecords.push(...generatedRecords);
  sourceCounts.generated = generatedRecords.length;

  if (flags.includeScraped) {
    const scraped = readAllJsonl(SCRAPED_DIR);
    allRecords.push(...scraped);
    sourceCounts.scraped = scraped.length;
  }

  if (flags.includeTelemetry) {
    const telemetry = readAllJsonl(TELEMETRY_DIR);
    allRecords.push(...telemetry);
    sourceCounts.telemetry = telemetry.length;
  }

  console.log('Sources:');
  for (const [source, count] of Object.entries(sourceCounts)) {
    console.log(`  ${source.padEnd(16)} ${count}`);
  }
  console.log(`  ${'total'.padEnd(16)} ${allRecords.length}`);

  // 2. Validate all records
  let validationErrors = 0;
  for (const record of allRecords) {
    const errors = validateRecord(record, { requireId: true });
    if (errors.length > 0) {
      console.error(`\nValidation error for ${record.id || '(no id)'}:`);
      for (const e of errors) console.error(`  ${e}`);
      validationErrors += errors.length;
    }
  }

  const idErrors = validateIdUniqueness(allRecords);
  if (idErrors.length > 0) {
    console.error('\nID uniqueness errors:');
    for (const e of idErrors) console.error(`  ${e}`);
    validationErrors += idErrors.length;
  }

  if (validationErrors > 0) {
    console.error(`\n${validationErrors} validation error(s). Fix before merging.`);
    process.exit(1);
  }

  // 3. Deduplicate by content hash (first-in-wins, curated survive because read first)
  const beforeDedup = allRecords.length;
  const deduped = deduplicate(allRecords);
  const removedCount = beforeDedup - deduped.length;
  if (removedCount > 0) {
    console.log(`\nDeduplication: removed ${removedCount} duplicate(s)`);
  }

  // 4. Benchmark-stable partitioning with generated-record exclusion
  //    Separate curated (non-synthetic) and generated pools
  const curatedPool = deduped.filter(r => r.source !== 'synthetic_mutation');
  const generatedPool = deduped.filter(r => r.source === 'synthetic_mutation');

  // Benchmark pinning: if a previous version exists, pin its benchmark records
  const pinnedBenchmarkIds = new Set();
  const latestVersion = findLatestVersion(VERSIONS_DIR);
  if (latestVersion) {
    const benchmarkPath = path.join(VERSIONS_DIR, latestVersion, 'benchmark.jsonl');
    if (fs.existsSync(benchmarkPath)) {
      const { readJsonl } = require('./lib/io');
      const prevBenchmark = readJsonl(benchmarkPath);
      for (const r of prevBenchmark) {
        if (r.id) pinnedBenchmarkIds.add(r.id);
      }
      console.log(`\nBenchmark pinning: ${pinnedBenchmarkIds.size} records from ${latestVersion}`);
    }
  }

  // Partition curated pool: pinned benchmark records excluded from assignPartitions
  const pinnedRecords = [];
  const unpinnedCurated = [];
  for (const r of curatedPool) {
    if (pinnedBenchmarkIds.has(r.id)) {
      pinnedRecords.push({ ...r, partition: 'benchmark' });
    } else {
      unpinnedCurated.push(r);
    }
  }

  const partitionedCurated = assignPartitions(unpinnedCurated);

  // Partition generated pool: 75% training / 25% validation (NO benchmark)
  const partitionedGenerated = partitionGeneratedRecords(generatedPool);

  // Merge all pools
  const merged = [...pinnedRecords, ...partitionedCurated, ...partitionedGenerated];

  // 5. Summary
  const summary = partitionSummary(merged);
  const splits = splitByPartition(merged);

  console.log(`\nPartition summary:`);
  console.log(`  training:     ${splits.training.length}`);
  console.log(`  validation:   ${splits.validation.length}`);
  console.log(`  benchmark:    ${splits.benchmark.length}`);
  console.log(`  total:        ${merged.length}`);

  // Verify no synthetic_mutation in benchmark
  const syntheticInBenchmark = splits.benchmark.filter(r => r.source === 'synthetic_mutation');
  if (syntheticInBenchmark.length > 0) {
    console.error(`\nERROR: ${syntheticInBenchmark.length} synthetic_mutation record(s) in benchmark!`);
    process.exit(1);
  }

  console.log('\nBy category:');
  for (const [cat, data] of Object.entries(summary).sort()) {
    console.log(`  ${cat.padEnd(28)} train=${data.training} val=${data.validation} bench=${data.benchmark}`);
  }

  console.log('\nBy source:');
  const bySource = {};
  for (const r of merged) {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  }
  for (const [src, count] of Object.entries(bySource).sort()) {
    console.log(`  ${src.padEnd(20)} ${count}`);
  }

  if (flags.dryRun) {
    console.log('\n--dry-run: no files written');
    return;
  }

  // 6. Clear existing .jsonl files from partition dirs (preserve .gitkeep)
  for (const dir of [TRAINING_DIR, VALIDATION_DIR, BENCHMARK_DIR]) {
    for (const file of walkJsonlFiles(dir)) {
      fs.unlinkSync(file);
    }
  }

  // 7. Write one file per category per partition directory
  let filesWritten = 0;
  for (const [partition, records] of Object.entries(splits)) {
    const dir = path.join(BASE_DIR, partition);
    const grouped = {};
    for (const r of records) {
      const cat = r.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }
    for (const [category, catRecords] of Object.entries(grouped).sort()) {
      catRecords.sort((a, b) => a.id.localeCompare(b.id));
      writeJsonl(path.join(dir, `${category}.jsonl`), catRecords);
      filesWritten++;
    }
  }

  console.log(`\nWrote ${filesWritten} file(s) to training/, validation/, benchmark/`);
}

/**
 * Partition generated records: 75% training, 25% validation, NO benchmark.
 * Sorted by id within each category, split at 75% mark.
 */
function partitionGeneratedRecords(records) {
  const byCategory = {};
  for (const r of records) {
    const cat = r.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }

  const result = [];
  for (const [, group] of Object.entries(byCategory)) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const splitIdx = Math.ceil(sorted.length * 0.75);
    for (let i = 0; i < sorted.length; i++) {
      const partition = i < splitIdx ? 'training' : 'validation';
      result.push({ ...sorted[i], partition });
    }
  }

  return result;
}

/**
 * Find the latest version directory by semver sort.
 * Returns directory name (e.g., "v0.1.0") or null if none exist.
 */
function findLatestVersion(versionsDir) {
  if (!fs.existsSync(versionsDir)) return null;

  const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
  const versions = entries
    .filter(e => e.isDirectory() && /^v\d+\.\d+\.\d+$/.test(e.name))
    .map(e => e.name)
    .sort((a, b) => {
      const pa = a.slice(1).split('.').map(Number);
      const pb = b.slice(1).split('.').map(Number);
      return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
    });

  return versions.length > 0 ? versions[versions.length - 1] : null;
}

if (require.main === module) {
  main();
}

module.exports = { findLatestVersion };
