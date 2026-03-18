// partition.js — Stratified dataset partitioning by category
//
// Assigns records to training (60%), validation (20%), benchmark (20%)
// partitions. Split is per-category to guarantee every attack category
// is represented in all three partitions.
//
// Algorithm:
// 1. Group records by category
// 2. Within each category, sort by id (deterministic)
// 3. Assign 60/20/20 within each category
// 4. Benign examples are also split 60/20/20

'use strict';

const PARTITIONS = {
  TRAINING: 'training',
  VALIDATION: 'validation',
  BENCHMARK: 'benchmark'
};

// Split ratios — must sum to 1.0
const SPLIT = {
  training: 0.6,
  validation: 0.2,
  benchmark: 0.2
};

/**
 * Assign partition labels to records using stratified splitting.
 * Records are grouped by category, sorted by id within each group,
 * then split 60/20/20.
 *
 * Does NOT mutate input records — returns new objects with partition field.
 *
 * @param {object[]} records - Array of dataset records (must have .id and .category)
 * @returns {object[]} New array with partition field added to each record
 */
function assignPartitions(records) {
  // Group by category
  const byCategory = new Map();
  for (const record of records) {
    const cat = record.category || 'unknown';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat).push(record);
  }

  const result = [];

  for (const [, group] of byCategory) {
    // Sort by id for deterministic assignment
    const sorted = [...group].sort((a, b) => {
      const idA = a.id || '';
      const idB = b.id || '';
      return idA.localeCompare(idB);
    });

    const total = sorted.length;
    const trainingEnd = Math.ceil(total * SPLIT.training);
    const validationEnd = trainingEnd + Math.ceil(total * SPLIT.validation);

    for (let i = 0; i < sorted.length; i++) {
      let partition;
      if (i < trainingEnd) {
        partition = PARTITIONS.TRAINING;
      } else if (i < validationEnd) {
        partition = PARTITIONS.VALIDATION;
      } else {
        partition = PARTITIONS.BENCHMARK;
      }

      result.push({ ...sorted[i], partition });
    }
  }

  return result;
}

/**
 * Split records into separate arrays by partition.
 *
 * @param {object[]} records - Records with partition field
 * @returns {object} { training: [], validation: [], benchmark: [] }
 */
function splitByPartition(records) {
  const splits = {
    training: [],
    validation: [],
    benchmark: []
  };

  for (const record of records) {
    const p = record.partition;
    if (splits[p]) {
      splits[p].push(record);
    }
  }

  return splits;
}

/**
 * Get partition assignment summary (counts by category and partition).
 *
 * @param {object[]} records - Records with partition field
 * @returns {object} Summary with counts
 */
function partitionSummary(records) {
  const summary = {};

  for (const record of records) {
    const cat = record.category || 'unknown';
    const part = record.partition || 'unassigned';

    if (!summary[cat]) {
      summary[cat] = { training: 0, validation: 0, benchmark: 0, total: 0 };
    }
    summary[cat][part] = (summary[cat][part] || 0) + 1;
    summary[cat].total++;
  }

  return summary;
}

module.exports = {
  PARTITIONS,
  SPLIT,
  assignPartitions,
  splitByPartition,
  partitionSummary
};
