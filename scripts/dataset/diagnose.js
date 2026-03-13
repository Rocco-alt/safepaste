#!/usr/bin/env node
// diagnose.js — Deep diagnostic report for dataset quality validation
//
// Reports: per-example pattern matches, score histogram, edge-case audit,
// category/context distribution, and pattern coverage analysis.

'use strict';

const path = require('path');
const fs = require('fs');
const { readJsonl, walkJsonlFiles } = require('./lib/io');
const { escapeForDisplay } = require('./lib/safety');

const PATTERNS = require('../../packages/shared/patterns');
const {
  findMatches,
  computeScore,
  isBenignContext,
  hasExfiltrationMatch,
  applyDampening
} = require('../../packages/shared/detect');

const THRESHOLD = 35;

function analyzeText(text) {
  const input = typeof text === 'string' ? text : '';
  const matches = findMatches(input, PATTERNS);
  const rawScore = computeScore(matches);
  const benign = isBenignContext(input);
  const exfiltrate = hasExfiltrationMatch(matches);
  const score = applyDampening(rawScore, benign, exfiltrate);
  const flagged = score >= THRESHOLD;
  return { flagged, score, rawScore, matches, dampened: benign && !exfiltrate, benignContext: benign };
}

function main() {
  const inputPath = path.resolve(process.argv[2] || 'datasets/prompt-injection/curated/');
  let files;
  if (fs.statSync(inputPath).isDirectory()) {
    files = walkJsonlFiles(inputPath);
  } else {
    files = [inputPath];
  }

  const records = [];
  for (const file of files) {
    records.push(...readJsonl(file));
  }

  // ================================================================
  // 1. PER-EXAMPLE PATTERN MATCH REPORT
  // ================================================================
  console.log('=' .repeat(70));
  console.log('1. PER-EXAMPLE PATTERN MATCHES');
  console.log('=' .repeat(70));

  const results = [];
  for (const r of records) {
    const result = analyzeText(r.text);
    results.push({ record: r, result });

    const id = r.id || '(no id)';
    const matchIds = result.matches.map(m => m.id).join(', ') || '(none)';
    const weights = result.matches.map(m => `${m.id}=${m.weight}`).join(', ') || '(none)';
    const dampenNote = result.dampened ? ' [DAMPENED]' : '';
    const mismatch = (r.expected_flagged !== result.flagged) ? ' *** MISMATCH ***' : '';

    console.log(`${id} | cat=${r.category} | label=${r.label}`);
    console.log(`  raw=${result.rawScore} final=${result.score} flagged=${result.flagged} expected=${r.expected_flagged}${dampenNote}${mismatch}`);
    console.log(`  patterns: ${weights}`);
    console.log(`  text: ${escapeForDisplay(r.text, 100)}`);
    console.log('');
  }

  // ================================================================
  // 2. SCORE HISTOGRAM (fine-grained)
  // ================================================================
  console.log('=' .repeat(70));
  console.log('2. SCORE DISTRIBUTION (final scores, 5-point bins)');
  console.log('=' .repeat(70));

  const bins = {};
  for (let i = 0; i <= 100; i += 5) {
    bins[`${i}-${i + 4}`] = [];
  }

  for (const { record, result } of results) {
    const score = result.score;
    const binStart = Math.floor(score / 5) * 5;
    const key = `${binStart}-${binStart + 4}`;
    if (bins[key]) {
      bins[key].push({ id: record.id, score, category: record.category, expected_flagged: record.expected_flagged });
    }
  }

  console.log('');
  console.log('Score  Count  Bar                      Examples');
  console.log('-'.repeat(70));
  for (const [range, entries] of Object.entries(bins)) {
    if (entries.length === 0) continue;
    const bar = '#'.repeat(entries.length);
    const ids = entries.map(e => e.id || '?').join(', ');
    const rangeStr = range.padEnd(7);
    console.log(`${rangeStr} ${String(entries.length).padStart(3)}  ${bar.padEnd(20)} ${ids}`);
  }

  // Borderline analysis (25-44)
  const borderline = results.filter(r => r.result.score >= 25 && r.result.score <= 44);
  console.log('');
  console.log(`Borderline examples (score 25-44): ${borderline.length}`);
  for (const { record, result } of borderline) {
    const id = record.id || '?';
    console.log(`  ${id} score=${result.score} raw=${result.rawScore} cat=${record.category} flagged=${result.flagged} expected=${record.expected_flagged}`);
  }

  // ================================================================
  // 3. EDGE-CASE AUDIT (below-threshold with expected_flagged=false)
  // ================================================================
  console.log('');
  console.log('=' .repeat(70));
  console.log('3. BELOW-THRESHOLD AUDIT (expected_flagged=false, label != benign)');
  console.log('=' .repeat(70));

  const belowThreshold = results.filter(r =>
    r.record.expected_flagged === false &&
    r.record.label !== 'benign' &&
    r.record.category !== 'benign'
  );

  console.log(`\nFound ${belowThreshold.length} below-threshold non-benign examples:\n`);
  for (const { record, result } of belowThreshold) {
    const matchIds = result.matches.map(m => `${m.id}(${m.weight})`).join(' + ') || '(none)';
    console.log(`[${record.id}] label=${record.label} cat=${record.category}`);
    console.log(`  score=${result.score} raw=${result.rawScore} dampened=${result.dampened}`);
    console.log(`  patterns: ${matchIds}`);
    console.log(`  reason: ${record.notes || '(no notes)'}`);
    console.log(`  text: ${escapeForDisplay(record.text, 120)}`);
    console.log('');
  }

  // ================================================================
  // 4. CATEGORY DISTRIBUTION
  // ================================================================
  console.log('=' .repeat(70));
  console.log('4. CATEGORY DISTRIBUTION');
  console.log('=' .repeat(70));

  const byCat = {};
  for (const r of records) {
    const cat = r.category || '?';
    if (!byCat[cat]) byCat[cat] = { total: 0, attack: 0, benign: 0, edge: 0 };
    byCat[cat].total++;
    if (r.label === 'attack') byCat[cat].attack++;
    else if (r.label === 'benign') byCat[cat].benign++;
    else byCat[cat].edge++;
  }

  console.log('');
  console.log('Category                      Total  Attack  Benign  Edge');
  console.log('-'.repeat(65));
  for (const [cat, counts] of Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)) {
    const warn = counts.total < 3 ? ' *** BELOW 3 ***' : '';
    console.log(`${cat.padEnd(30)} ${String(counts.total).padStart(4)}  ${String(counts.attack).padStart(5)}  ${String(counts.benign).padStart(6)}  ${String(counts.edge).padStart(5)}${warn}`);
  }

  // ================================================================
  // 4b. CATEGORY × SCORE DIAGNOSTICS
  // ================================================================
  console.log('');
  console.log('=' .repeat(70));
  console.log('4b. CATEGORY x SCORE (avg / min / max final score)');
  console.log('=' .repeat(70));

  const catScores = {};
  for (const { record, result } of results) {
    const cat = record.category || '?';
    if (!catScores[cat]) catScores[cat] = [];
    catScores[cat].push(result.score);
  }

  console.log('');
  console.log('Category                       Avg    Min    Max  Scores');
  console.log('-'.repeat(70));
  for (const [cat, scores] of Object.entries(catScores).sort((a, b) => a[0].localeCompare(b[0]))) {
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const spread = scores.sort((a, b) => a - b).join(', ');
    console.log(`${cat.padEnd(30)} ${avg.padStart(5)}  ${String(min).padStart(5)}  ${String(max).padStart(5)}  [${spread}]`);
  }

  // ================================================================
  // 5. CONTEXT TYPE DISTRIBUTION
  // ================================================================
  console.log('');
  console.log('=' .repeat(70));
  console.log('5. CONTEXT TYPE DISTRIBUTION');
  console.log('=' .repeat(70));

  const byCtx = {};
  for (const r of records) {
    const ctx = r.context_type || '(none)';
    byCtx[ctx] = (byCtx[ctx] || 0) + 1;
  }

  console.log('');
  for (const [ctx, count] of Object.entries(byCtx).sort((a, b) => b[1] - a[1])) {
    const bar = '#'.repeat(count);
    console.log(`  ${ctx.padEnd(20)} ${String(count).padStart(3)} ${bar}`);
  }

  // ================================================================
  // 6. PATTERN FAMILY COVERAGE
  // ================================================================
  console.log('');
  console.log('=' .repeat(70));
  console.log('6. PATTERN FAMILY COVERAGE');
  console.log('=' .repeat(70));

  const patternHits = {};
  for (const p of PATTERNS) {
    patternHits[p.id] = { weight: p.weight, examples: [] };
  }

  for (const { record, result } of results) {
    for (const m of result.matches) {
      if (patternHits[m.id]) {
        patternHits[m.id].examples.push(record.id || '?');
      }
    }
  }

  console.log('');
  console.log('Pattern ID                          W   Hits  Examples');
  console.log('-'.repeat(70));
  for (const [pid, data] of Object.entries(patternHits)) {
    const hitCount = data.examples.length;
    const warn = hitCount === 0 ? ' *** NEVER TRIGGERED ***' : '';
    const exampleStr = data.examples.slice(0, 5).join(', ');
    const more = data.examples.length > 5 ? ` (+${data.examples.length - 5} more)` : '';
    console.log(`${pid.padEnd(35)} ${String(data.weight).padStart(2)}  ${String(hitCount).padStart(4)}  ${exampleStr}${more}${warn}`);
  }

  // Summary
  const totalPatterns = PATTERNS.length;
  const triggered = Object.values(patternHits).filter(d => d.examples.length > 0).length;
  const untriggered = Object.entries(patternHits).filter(([, d]) => d.examples.length === 0).map(([id]) => id);

  console.log('');
  console.log(`Patterns triggered: ${triggered}/${totalPatterns}`);
  if (untriggered.length > 0) {
    console.log(`Never triggered: ${untriggered.join(', ')}`);
  }

  // Uniqueness check: how many examples trigger ONLY one pattern?
  const singlePatternExamples = results.filter(r => r.result.matches.length === 1).length;
  const multiPatternExamples = results.filter(r => r.result.matches.length > 1).length;
  const noPatternExamples = results.filter(r => r.result.matches.length === 0).length;

  console.log('');
  console.log(`Pattern match distribution:`);
  console.log(`  0 patterns: ${noPatternExamples} examples`);
  console.log(`  1 pattern:  ${singlePatternExamples} examples`);
  console.log(`  2+ patterns: ${multiPatternExamples} examples`);
}

main();
