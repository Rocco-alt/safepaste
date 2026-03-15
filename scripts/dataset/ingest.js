#!/usr/bin/env node
// ingest.js — CLI orchestrator for ingesting external dataset records into scraped/
//
// Usage:
//   node scripts/dataset/ingest.js <adapter> <source> [options]
//
// Adapters:
//   jsonl-file    Import from a local JSONL file
//   huggingface   Fetch from HuggingFace datasets API
//
// Examples:
//   node scripts/dataset/ingest.js jsonl-file data.jsonl --license MIT --author "Some Lab"
//   node scripts/dataset/ingest.js huggingface deepset/prompt-injections --license apache-2.0 --author deepset --limit 100
//   node scripts/dataset/ingest.js jsonl-file data.jsonl --license MIT --category-map '{"1":"instruction_override","0":"benign"}' --infer-expected-flagged

'use strict';

const fs = require('fs');
const path = require('path');
const { readAllJsonl, writeJsonl, nextId } = require('./lib/io');
const { validateRecord } = require('./lib/schema');
const { contentHash } = require('./lib/dedup');
const { escapeForDisplay } = require('./lib/safety');
const { PROMPT_INJECTION_CATEGORY_KEYS } = require('./lib/categories');

const DATASET_DIR = path.resolve(__dirname, '../../datasets/prompt-injection');
const CURATED_DIR = path.join(DATASET_DIR, 'curated');
const SCRAPED_DIR = path.join(DATASET_DIR, 'scraped');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error(
      'Usage: node scripts/dataset/ingest.js <adapter> <source> [options]\n\n' +
      'Options:\n' +
      '  --text-field <name>          Source field for text (default: "text")\n' +
      '  --label-field <name>         Source field for label (default: "label")\n' +
      '  --category-field <name>      Source field for category (default: "category")\n' +
      '  --category-map <json>        Map source values to categories\n' +
      '  --default-category <cat>     Fallback category\n' +
      '  --license <string>           REQUIRED — license string\n' +
      '  --author <string>            Original author (default: "unknown")\n' +
      '  --limit <n>                  Max records to import\n' +
      '  --split <name>               HuggingFace split (default: "train")\n' +
      '  --config <name>              HuggingFace config (default: "default")\n' +
      '  --infer-expected-flagged     Derive expected_flagged from label\n' +
      '  --dry-run                    Validate without writing'
    );
    process.exit(1);
  }

  const parsed = {
    adapter: args[0],
    source: args[1],
    textField: 'text',
    labelField: 'label',
    categoryField: 'category',
    categoryMap: null,
    defaultCategory: null,
    license: null,
    author: 'unknown',
    limit: null,
    split: 'train',
    hfConfig: 'default',
    inferExpectedFlagged: false,
    dryRun: false
  };

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--text-field':      parsed.textField = args[++i]; break;
      case '--label-field':     parsed.labelField = args[++i]; break;
      case '--category-field':  parsed.categoryField = args[++i]; break;
      case '--category-map':    parsed.categoryMap = JSON.parse(args[++i]); break;
      case '--default-category': parsed.defaultCategory = args[++i]; break;
      case '--license':         parsed.license = args[++i]; break;
      case '--author':          parsed.author = args[++i]; break;
      case '--limit':           parsed.limit = parseInt(args[++i], 10); break;
      case '--split':           parsed.split = args[++i]; break;
      case '--config':          parsed.hfConfig = args[++i]; break;
      case '--infer-expected-flagged': parsed.inferExpectedFlagged = true; break;
      case '--dry-run':         parsed.dryRun = true; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!parsed.license) {
    console.error('Error: --license is required');
    process.exit(1);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Record transformation
// ---------------------------------------------------------------------------

// NOTE: When --infer-expected-flagged is used, expected_flagged values are
// PROVISIONAL quarantine metadata derived from the label field. This field
// is normally hand-set in curated records — some attacks intentionally have
// expected_flagged: false when their score falls below the detection
// threshold. Inferred values MUST be reviewed and corrected during manual
// promotion from scraped/ to curated/.
//
// Without --infer-expected-flagged, the field is omitted and the record
// will fail schema validation. This is intentional — it prevents
// speculative evaluation labels from entering the pipeline.

function transformRecord(raw, config, sourceUrl, collectionMethod) {
  const text = raw[config.textField];
  const label = raw[config.labelField];
  let category = raw[config.categoryField];

  // Apply category map if provided
  if (config.categoryMap && category != null && String(category) in config.categoryMap) {
    category = config.categoryMap[String(category)];
  }

  // Apply default category fallback
  if (!category && config.defaultCategory) {
    category = config.defaultCategory;
  }

  const record = {
    text: text,
    label: label,
    category: category,
    source: 'scraped',
    date_added: new Date().toISOString().split('T')[0],
    metadata: {
      source_url: sourceUrl,
      license: config.license,
      collection_method: collectionMethod,
      original_author: config.author
    }
  };

  // Handle expected_flagged
  if (typeof raw.expected_flagged === 'boolean') {
    // Source record already has it — pass through
    record.expected_flagged = raw.expected_flagged;
  } else if (config.inferExpectedFlagged && label) {
    // Opt-in inference from label
    record.expected_flagged = label !== 'benign';
  }
  // Otherwise: omit field — schema validation will reject, which is intentional

  return record;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const config = parseArgs(process.argv);

  // Load adapter
  let adapter;
  try {
    adapter = require('./adapters/' + config.adapter);
  } catch (err) {
    console.error(`Error: adapter "${config.adapter}" not found (${err.message})`);
    process.exit(1);
  }

  // Fetch records from source
  console.log(`Fetching from ${config.adapter}: ${config.source}...`);
  const adapterConfig = {
    limit: config.limit,
    split: config.split,
    hfConfig: config.hfConfig
  };
  const { records: rawRecords, sourceUrl, collectionMethod } = await adapter.fetch(config.source, adapterConfig);
  console.log(`Fetched: ${rawRecords.length} records`);

  // Track counts for summary
  const counts = {
    fetched: rawRecords.length,
    categoryRejected: 0,
    schemaInvalid: 0,
    dedupBatch: 0,
    dedupCurated: 0,
    dedupScraped: 0,
    written: 0
  };

  // Transform records
  const transformed = [];
  for (let i = 0; i < rawRecords.length; i++) {
    const record = transformRecord(rawRecords[i], config, sourceUrl, collectionMethod);

    // Category validation (pre-schema)
    if (!record.category || !PROMPT_INJECTION_CATEGORY_KEYS.includes(record.category)) {
      const display = escapeForDisplay(String(record.category || '(empty)'), 50);
      console.warn(`  [${i}] Category rejected: ${display} — not in taxonomy`);
      counts.categoryRejected++;
      continue;
    }

    // Schema validation (no requireId — IDs assigned later)
    const errors = validateRecord(record, { dataset: 'prompt-injection' });
    if (errors.length > 0) {
      const display = escapeForDisplay(String(record.text || ''), 80);
      console.warn(`  [${i}] Schema invalid: ${errors.join('; ')}`);
      if (typeof record.expected_flagged === 'undefined') {
        console.warn(`        → Use --infer-expected-flagged to derive from label, or provide expected_flagged in source data`);
      }
      counts.schemaInvalid++;
      continue;
    }

    transformed.push(record);
  }

  // Dedup pass 1: within the import batch (first occurrence wins)
  const batchSeen = new Set();
  const afterBatchDedup = [];
  for (const record of transformed) {
    const hash = contentHash(record.text);
    if (batchSeen.has(hash)) {
      counts.dedupBatch++;
    } else {
      batchSeen.add(hash);
      afterBatchDedup.push(record);
    }
  }

  // Dedup pass 2: against existing curated/ records
  const curatedRecords = readAllJsonl(CURATED_DIR);
  const curatedHashes = new Set(curatedRecords.map(r => contentHash(r.text)));

  const afterCuratedDedup = [];
  for (const record of afterBatchDedup) {
    const hash = contentHash(record.text);
    if (curatedHashes.has(hash)) {
      counts.dedupCurated++;
    } else {
      afterCuratedDedup.push(record);
    }
  }

  // Dedup pass 3: against existing scraped/ records
  const scrapedRecords = readAllJsonl(SCRAPED_DIR);
  const scrapedHashes = new Set(scrapedRecords.map(r => contentHash(r.text)));

  const afterAllDedup = [];
  for (const record of afterCuratedDedup) {
    const hash = contentHash(record.text);
    if (scrapedHashes.has(hash)) {
      counts.dedupScraped++;
    } else {
      afterAllDedup.push(record);
    }
  }

  if (config.dryRun) {
    console.log('\n--- DRY RUN (no files written) ---');
    printSummary(counts, afterAllDedup.length);
    return;
  }

  if (afterAllDedup.length === 0) {
    console.log('\nNo new records to write (all filtered or deduplicated).');
    printSummary(counts, 0);
    return;
  }

  // Assign IDs
  // nextId scans the entire dataset dir, so we get the global max once,
  // then increment sequentially for each new record.
  // NOTE: This assumes single-process execution. Concurrent ingest runs
  // could allocate overlapping IDs. Run ingests sequentially.
  const firstId = nextId(DATASET_DIR, 'safepaste_pi');
  const firstNum = parseInt(firstId.match(/(\d+)$/)[1], 10);

  for (let i = 0; i < afterAllDedup.length; i++) {
    const num = firstNum + i;
    afterAllDedup[i].id = `safepaste_pi_${String(num).padStart(6, '0')}`;
  }

  // Group by category and write to scraped/<category>.jsonl
  const byCategory = new Map();
  for (const record of afterAllDedup) {
    if (!byCategory.has(record.category)) {
      byCategory.set(record.category, []);
    }
    byCategory.get(record.category).push(record);
  }

  const categoryFiles = new Set();
  for (const [category, newRecords] of byCategory) {
    const filePath = path.join(SCRAPED_DIR, `${category}.jsonl`);

    // Read existing records in this file (if any)
    let existing = [];
    if (fs.existsSync(filePath)) {
      const { readJsonl } = require('./lib/io');
      existing = readJsonl(filePath);
    }

    // Concat and dedup the combined set by contentHash (prevents duplicate
    // writes on re-ingest)
    const combined = [...existing, ...newRecords];
    const seen = new Set();
    const deduped = [];
    for (const r of combined) {
      const hash = contentHash(r.text);
      if (!seen.has(hash)) {
        seen.add(hash);
        deduped.push(r);
      }
    }

    writeJsonl(filePath, deduped);
    categoryFiles.add(category);
  }

  counts.written = afterAllDedup.length;
  printSummary(counts, counts.written, categoryFiles.size);
}

function printSummary(counts, written, categoryFileCount) {
  console.log('\nIngestion summary:');
  console.log(`  Fetched:              ${String(counts.fetched).padStart(4)}`);
  console.log(`  Category rejected:    ${String(counts.categoryRejected).padStart(4)}   (unmapped category)`);
  console.log(`  Schema invalid:       ${String(counts.schemaInvalid).padStart(4)}   (missing expected_flagged, etc.)`);
  console.log(`  Dedup (within batch): ${String(counts.dedupBatch).padStart(4)}`);
  console.log(`  Dedup (vs curated):   ${String(counts.dedupCurated).padStart(4)}`);
  console.log(`  Dedup (vs scraped):   ${String(counts.dedupScraped).padStart(4)}`);
  if (categoryFileCount !== undefined) {
    console.log(`  Written:              ${String(written).padStart(4)}   → scraped/ (${categoryFileCount} category files)`);
  } else {
    console.log(`  Would write:          ${String(written).padStart(4)}`);
  }
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
