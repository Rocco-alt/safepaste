#!/usr/bin/env node
// mutate.js — Generate mutation variants from curated attack examples
//
// Reads curated attack records, applies deterministic mutation strategies,
// and writes generated variants to datasets/prompt-injection/generated/.
//
// Usage:
//   node scripts/dataset/mutate.js [--dry-run] [--category <cat>]
//
// Full regeneration each run — clears generated/ and rewrites all variants.
// Running twice produces identical output (deterministic).

'use strict';

const path = require('path');
const fs = require('fs');
const { readAllJsonl, writeJsonl, walkJsonlFiles } = require('./lib/io');
const { contentHash } = require('./lib/dedup');
const { mutateRecord } = require('./lib/mutations');

const CURATED_DIR = path.join(__dirname, '../../datasets/prompt-injection/curated');
const GENERATED_DIR = path.join(__dirname, '../../datasets/prompt-injection/generated');

function main() {
  const args = process.argv.slice(2);
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      flags.dryRun = true;
    } else if (args[i] === '--category' && args[i + 1]) {
      flags.category = args[++i];
    }
  }

  // 1. Read all curated records
  const allRecords = readAllJsonl(CURATED_DIR);
  let attacks = allRecords.filter(r => r.label === 'attack');

  if (flags.category) {
    attacks = attacks.filter(r => r.category === flags.category);
  }

  console.log(`Seeds: ${attacks.length} attack records from curated/`);
  if (flags.category) {
    console.log(`Category filter: ${flags.category}`);
  }

  // 2. Build content hash set of curated corpus for dedup
  const curatedHashes = new Set();
  for (const r of allRecords) {
    curatedHashes.add(contentHash(r.text));
  }

  // 3. Generate mutations
  const byStrategy = {};
  const byCategory = {};
  let totalGenerated = 0;
  let dedupedAgainstCurated = 0;
  let dedupedAgainstSelf = 0;

  const variantHashes = new Set();
  const allVariants = [];

  for (const record of attacks) {
    const variants = mutateRecord(record);

    for (const variant of variants) {
      const hash = contentHash(variant.text);

      // Dedup against curated corpus
      if (curatedHashes.has(hash)) {
        dedupedAgainstCurated++;
        continue;
      }

      // Dedup against other generated variants
      if (variantHashes.has(hash)) {
        dedupedAgainstSelf++;
        continue;
      }

      variantHashes.add(hash);
      allVariants.push(variant);
      totalGenerated++;

      // Track stats
      byStrategy[variant.mutation_type] = (byStrategy[variant.mutation_type] || 0) + 1;
      byCategory[variant.category] = (byCategory[variant.category] || 0) + 1;
    }
  }

  // 4. Summary
  console.log(`\nGenerated: ${totalGenerated} variants`);
  console.log(`Deduped: ${dedupedAgainstCurated} (vs curated) + ${dedupedAgainstSelf} (vs self)`);

  console.log('\nBy strategy:');
  for (const [strategy, count] of Object.entries(byStrategy).sort()) {
    console.log(`  ${strategy.padEnd(20)} ${count}`);
  }

  console.log('\nBy category:');
  for (const [category, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${category.padEnd(28)} ${count}`);
  }

  if (flags.dryRun) {
    console.log('\n--dry-run: no files written');
    return;
  }

  // 5. Clear existing .jsonl files from generated/ (preserve .gitkeep)
  const existingFiles = walkJsonlFiles(GENERATED_DIR);
  for (const file of existingFiles) {
    fs.unlinkSync(file);
  }

  // 6. Group by category and write one JSONL per category
  const grouped = {};
  for (const variant of allVariants) {
    const cat = variant.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(variant);
  }

  let filesWritten = 0;
  for (const [category, records] of Object.entries(grouped).sort()) {
    // Sort by id within category for deterministic output
    records.sort((a, b) => a.id.localeCompare(b.id));
    const filePath = path.join(GENERATED_DIR, `${category}.jsonl`);
    writeJsonl(filePath, records);
    filesWritten++;
  }

  console.log(`\nWrote ${filesWritten} file(s) to generated/`);
}

main();
