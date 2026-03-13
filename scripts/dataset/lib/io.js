// io.js — JSONL read/write/walk utilities for dataset pipeline
//
// Provides safe, consistent I/O for JSONL dataset files.
// All text is treated as data — never interpreted as code.

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read a JSONL file and return an array of parsed objects.
 * Skips blank lines. Throws on malformed JSON.
 *
 * @param {string} filePath - Path to .jsonl file
 * @returns {object[]} Array of parsed records
 */
function readJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const records = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`${filePath}:${i + 1}: Invalid JSON — ${err.message}`);
    }
  }
  return records;
}

/**
 * Write an array of objects to a JSONL file (overwrites).
 *
 * @param {string} filePath - Path to .jsonl file
 * @param {object[]} records - Array of objects to serialize
 */
function writeJsonl(filePath, records) {
  const lines = records.map(r => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Append a single record to a JSONL file.
 *
 * @param {string} filePath - Path to .jsonl file
 * @param {object} record - Object to append
 */
function appendJsonl(filePath, record) {
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
}

/**
 * Recursively walk a directory and return all .jsonl file paths.
 *
 * @param {string} dir - Directory to walk
 * @returns {string[]} Array of absolute paths to .jsonl files
 */
function walkJsonlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      results.push(full);
    }
  }
  return results.sort();
}

/**
 * Read all JSONL records from all .jsonl files in a directory (recursive).
 *
 * @param {string} dir - Directory to read
 * @returns {object[]} All records from all files
 */
function readAllJsonl(dir) {
  const files = walkJsonlFiles(dir);
  const records = [];
  for (const file of files) {
    records.push(...readJsonl(file));
  }
  return records;
}

/**
 * Find the next sequential ID for a given prefix by scanning all JSONL files
 * in a directory. IDs are never reused.
 *
 * Format: safepaste_pi_NNNNNN or safepaste_rag_NNNNNN
 *
 * @param {string} dir - Directory to scan for existing IDs
 * @param {string} prefix - ID prefix: "safepaste_pi" or "safepaste_rag"
 * @returns {string} Next available ID
 */
function nextId(dir, prefix) {
  const records = readAllJsonl(dir);
  let maxNum = 0;

  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  for (const record of records) {
    if (typeof record.id !== 'string') continue;
    const m = record.id.match(pattern);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const next = maxNum + 1;
  return `${prefix}_${String(next).padStart(6, '0')}`;
}

module.exports = {
  readJsonl,
  writeJsonl,
  appendJsonl,
  walkJsonlFiles,
  readAllJsonl,
  nextId
};
