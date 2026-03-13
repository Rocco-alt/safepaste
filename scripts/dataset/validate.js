#!/usr/bin/env node
// validate.js — Dataset validation script
//
// Validates JSONL dataset files for schema correctness, content integrity,
// licensing metadata, and ID uniqueness.
//
// Usage:
//   node scripts/dataset/validate.js <path>           # Validate a file or directory
//   node scripts/dataset/validate.js <path> --strict   # Require id field on all records
//
// Exit codes:
//   0 = all valid
//   1 = validation errors found

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');
const { validateRecord, validateIdUniqueness } = require('./lib/schema');
const { findDuplicates } = require('./lib/dedup');
const { escapeForDisplay } = require('./lib/safety');

function main() {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const paths = args.filter(a => !a.startsWith('--'));

  if (paths.length === 0) {
    console.error('Usage: node scripts/dataset/validate.js <path> [--strict]');
    console.error('  <path>    Path to a .jsonl file or directory containing .jsonl files');
    console.error('  --strict  Require id field on all records');
    process.exit(1);
  }

  const strict = flags.includes('--strict');

  // Detect dataset type from path
  const inputPath = path.resolve(paths[0]);
  const isRag = inputPath.includes('rag-injection');
  const dataset = isRag ? 'rag-injection' : 'prompt-injection';

  // Collect all JSONL files
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

  let totalRecords = 0;
  let totalErrors = 0;
  const allRecords = [];

  console.log(`Validating ${files.length} file(s) [dataset: ${dataset}, strict: ${strict}]\n`);

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    let records;
    try {
      records = readJsonl(file);
    } catch (err) {
      console.error(`  FAIL  ${relPath}`);
      console.error(`        ${err.message}`);
      totalErrors++;
      continue;
    }

    let fileErrors = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const errors = validateRecord(record, { dataset, requireId: strict });

      if (errors.length > 0) {
        if (fileErrors === 0) {
          console.error(`  FAIL  ${relPath}`);
        }
        for (const error of errors) {
          const preview = record.text
            ? escapeForDisplay(record.text, 60)
            : '(no text)';
          console.error(`        Line ${i + 1}: ${error}`);
          console.error(`          text: ${preview}`);
          fileErrors++;
        }
      }
    }

    if (fileErrors === 0) {
      console.log(`  OK    ${relPath} (${records.length} records)`);
    }

    totalRecords += records.length;
    totalErrors += fileErrors;
    allRecords.push(...records);
  }

  // Cross-file checks
  console.log('');

  // ID uniqueness
  const idErrors = validateIdUniqueness(allRecords);
  if (idErrors.length > 0) {
    console.error('ID uniqueness errors:');
    for (const error of idErrors) {
      console.error(`  ${error}`);
    }
    totalErrors += idErrors.length;
  }

  // Duplicate content check (warning only, not an error)
  const { duplicates } = findDuplicates(allRecords);
  if (duplicates.length > 0) {
    console.log(`WARNING: ${duplicates.length} duplicate text(s) found:`);
    for (const dup of duplicates) {
      const ids = dup.records.map(r => r.id || '(no id)').join(', ');
      const preview = escapeForDisplay(dup.records[0].text, 60);
      console.log(`  ${dup.records.length} copies [${ids}]: ${preview}`);
    }
  }

  // Summary
  console.log('');
  console.log(`Validated ${totalRecords} records across ${files.length} file(s)`);

  if (totalErrors > 0) {
    console.error(`${totalErrors} error(s) found`);
    process.exit(1);
  } else {
    console.log('All records valid');
    process.exit(0);
  }
}

main();
