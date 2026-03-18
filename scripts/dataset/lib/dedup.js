// dedup.js — SHA-256 content hashing and deduplication
//
// Uses text content hash to identify duplicate examples across files.

'use strict';

const crypto = require('crypto');

/**
 * Compute SHA-256 hash of text content.
 *
 * @param {string} text - Text to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function contentHash(text) {
  if (typeof text !== 'string') return '';
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Find duplicate records in an array based on text content hash.
 * Returns groups of records that share the same text.
 *
 * @param {object[]} records - Array of dataset records (must have .text)
 * @returns {object} { duplicates: Array<{hash, records}>, unique: number, total: number }
 */
function findDuplicates(records) {
  const byHash = new Map();

  for (const record of records) {
    if (typeof record.text !== 'string') continue;
    const hash = contentHash(record.text);
    if (!byHash.has(hash)) {
      byHash.set(hash, []);
    }
    byHash.get(hash).push(record);
  }

  const duplicates = [];
  for (const [hash, group] of byHash) {
    if (group.length > 1) {
      duplicates.push({ hash, records: group });
    }
  }

  return {
    duplicates,
    unique: byHash.size,
    total: records.length
  };
}

/**
 * Deduplicate records, keeping the first occurrence of each unique text.
 *
 * @param {object[]} records - Array of dataset records
 * @returns {object[]} Deduplicated array (first occurrence wins)
 */
function deduplicate(records) {
  const seen = new Set();
  const result = [];

  for (const record of records) {
    if (typeof record.text !== 'string') continue;
    const hash = contentHash(record.text);
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(record);
    }
  }

  return result;
}

module.exports = {
  contentHash,
  findDuplicates,
  deduplicate
};
