#!/usr/bin/env node
// view.js — Safe escaped dataset viewer
//
// Displays dataset records with all text safely escaped.
// Uses escapeForDisplay() to prevent rendering of attack strings.
//
// Usage:
//   node scripts/dataset/view.js <path>
//   node scripts/dataset/view.js <path> --format json
//   node scripts/dataset/view.js <path> --format csv
//   node scripts/dataset/view.js <path> --category instruction_override --limit 5

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');
const { escapeForDisplay } = require('./lib/safety');

function main() {
  const args = process.argv.slice(2);
  const flags = {};
  const paths = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      flags.format = args[++i];
    } else if (args[i] === '--category' && args[i + 1]) {
      flags.category = args[++i];
    } else if (args[i] === '--label' && args[i + 1]) {
      flags.label = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
      flags.limit = parseInt(args[++i], 10);
    } else if (!args[i].startsWith('--')) {
      paths.push(args[i]);
    }
  }

  if (paths.length === 0) {
    console.error('Usage: node scripts/dataset/view.js <path> [--format table|json|csv] [--category X] [--label X] [--limit N]');
    process.exit(1);
  }

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

  // Apply filters
  if (flags.category) {
    records = records.filter(r => r.category === flags.category);
  }
  if (flags.label) {
    records = records.filter(r => r.label === flags.label);
  }
  if (flags.limit && flags.limit > 0) {
    records = records.slice(0, flags.limit);
  }

  const format = flags.format || 'table';

  if (format === 'json') {
    outputJson(records);
  } else if (format === 'csv') {
    outputCsv(records);
  } else {
    outputTable(records);
  }
}

function outputTable(records) {
  if (records.length === 0) {
    console.log('No records found.');
    return;
  }

  console.log(`Showing ${records.length} record(s)\n`);

  for (const r of records) {
    const id = r.id || '(no id)';
    const text = escapeForDisplay(r.text, 120);
    const label = r.label || '?';
    const cat = r.category || '?';
    const flagged = r.expected_flagged ? 'YES' : 'no';
    const diff = r.difficulty || '-';

    console.log(`[${id}] ${label} | ${cat} | flagged=${flagged} | diff=${diff}`);
    console.log(`  ${text}`);
    if (r.notes) {
      console.log(`  note: ${escapeForDisplay(r.notes, 120)}`);
    }
    console.log('');
  }
}

function outputJson(records) {
  const safe = records.map(r => ({
    ...r,
    text: escapeForDisplay(r.text, 500)
  }));
  console.log(JSON.stringify(safe, null, 2));
}

function outputCsv(records) {
  const headers = ['id', 'label', 'category', 'expected_flagged', 'difficulty', 'source', 'context_type', 'text'];
  console.log(headers.join(','));

  for (const r of records) {
    const row = [
      r.id || '',
      r.label || '',
      r.category || '',
      r.expected_flagged === true ? 'true' : 'false',
      r.difficulty || '',
      r.source || '',
      r.context_type || '',
      '"' + escapeForDisplay(r.text, 200).replace(/"/g, '""') + '"'
    ];
    console.log(row.join(','));
  }
}

main();
