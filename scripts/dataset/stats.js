#!/usr/bin/env node
// stats.js — Dataset growth metrics and category coverage
//
// Usage:
//   node scripts/dataset/stats.js <path>
//   node scripts/dataset/stats.js <path> --json

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');

function countBy(records, field) {
  const counts = {};
  for (const r of records) {
    const val = r[field] || '(unset)';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function main() {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');
  const paths = args.filter(a => !a.startsWith('--'));

  if (paths.length === 0) {
    console.error('Usage: node scripts/dataset/stats.js <path> [--json]');
    process.exit(1);
  }

  const inputPath = path.resolve(paths[0]);
  let files;
  if (fs.statSync(inputPath).isDirectory()) {
    files = walkJsonlFiles(inputPath);
  } else {
    files = [inputPath];
  }

  const records = [];
  const fileStats = [];
  for (const file of files) {
    const recs = readJsonl(file);
    records.push(...recs);
    fileStats.push({ file: path.relative(process.cwd(), file), records: recs.length });
  }

  const byCategory = countBy(records, 'category');
  const byLabel = countBy(records, 'label');
  const bySource = countBy(records, 'source');
  const byDifficulty = countBy(records, 'difficulty');
  const byContextType = countBy(records, 'context_type');

  const withId = records.filter(r => typeof r.id === 'string' && r.id.length > 0).length;
  const withScoreRange = records.filter(r => Array.isArray(r.expected_score_range)).length;

  const report = {
    total_files: files.length,
    total_records: records.length,
    records_with_id: withId,
    records_with_score_range: withScoreRange,
    by_category: byCategory,
    by_label: byLabel,
    by_source: bySource,
    by_difficulty: byDifficulty,
    by_context_type: byContextType,
    files: fileStats
  };

  if (jsonFlag) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Dataset Statistics');
  console.log('='.repeat(50));
  console.log(`Files: ${report.total_files}`);
  console.log(`Records: ${report.total_records}`);
  console.log(`With ID: ${withId} | With score range: ${withScoreRange}`);
  console.log('');

  printSection('By category', byCategory);
  printSection('By label', byLabel);
  printSection('By source', bySource);
  printSection('By difficulty', byDifficulty);
  printSection('By context_type', byContextType);

  console.log('Files:');
  for (const f of fileStats) {
    console.log(`  ${f.file} (${f.records})`);
  }
}

function printSection(title, data) {
  console.log(`${title}:`);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted) {
    const bar = '#'.repeat(Math.min(count, 40));
    console.log(`  ${key.padEnd(28)} ${String(count).padStart(4)} ${bar}`);
  }
  console.log('');
}

main();
