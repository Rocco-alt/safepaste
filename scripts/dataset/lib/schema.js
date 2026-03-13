// schema.js — JSONL schema validation for dataset records
//
// Validates required/optional fields, valid values, ID format/uniqueness,
// and licensing metadata for scraped data.

'use strict';

const {
  PROMPT_INJECTION_CATEGORY_KEYS,
  RAG_INJECTION_CATEGORY_KEYS
} = require('./categories');

const VALID_LABELS = ['attack', 'benign', 'edge-case'];
const VALID_SOURCES = ['manual', 'research', 'real-world', 'generated', 'synthetic_mutation', 'scraped', 'telemetry'];
const VALID_DIFFICULTIES = ['easy', 'hard'];
const VALID_CONTEXT_TYPES = ['chat', 'email', 'markdown', 'documentation', 'code_comment', 'forum_post', 'support_ticket'];
const VALID_PARTITIONS = ['training', 'validation', 'benchmark'];
const VALID_RAG_DOC_TYPES = ['markdown', 'html', 'pdf', 'readme', 'documentation', 'plaintext'];
const VALID_RAG_LOCATIONS = ['header', 'body', 'footer', 'metadata', 'comment', 'hidden'];

const PI_ID_PATTERN = /^safepaste_pi_\d{6}$/;
const RAG_ID_PATTERN = /^safepaste_rag_\d{6}$/;

/**
 * Validate a single dataset record.
 *
 * @param {object} record - Parsed JSON record
 * @param {object} [options]
 * @param {string} [options.dataset='prompt-injection'] - Dataset type
 * @param {boolean} [options.requireId=false] - Whether id field is required
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateRecord(record, options = {}) {
  const errors = [];
  const dataset = options.dataset || 'prompt-injection';
  const requireId = options.requireId || false;

  if (!record || typeof record !== 'object') {
    return ['Record is not an object'];
  }

  // Required fields
  if (typeof record.text !== 'string' || record.text.length === 0) {
    errors.push('Missing or empty required field: text');
  }

  if (!VALID_LABELS.includes(record.label)) {
    errors.push(`Invalid label: "${record.label}" (must be one of: ${VALID_LABELS.join(', ')})`);
  }

  const validCategories = dataset === 'rag-injection'
    ? RAG_INJECTION_CATEGORY_KEYS
    : PROMPT_INJECTION_CATEGORY_KEYS;

  // Accept both old-style and new-style category names
  const oldToNew = {
    system_prompt: 'system_prompt_extraction',
    exfiltration: 'data_exfiltration',
    jailbreak: 'jailbreak_bypass',
    obfuscation: 'encoding_obfuscation',
    meta: 'meta_prompt_attacks',
    secrecy: 'secrecy_manipulation'
  };

  const category = record.category;
  const isOldCategory = Object.keys(oldToNew).includes(category);
  if (!validCategories.includes(category) && !isOldCategory) {
    errors.push(`Invalid category: "${category}" (must be one of: ${validCategories.join(', ')})`);
  }

  if (typeof record.expected_flagged !== 'boolean') {
    errors.push('Missing or invalid required field: expected_flagged (must be boolean)');
  }

  if (!VALID_SOURCES.includes(record.source)) {
    errors.push(`Invalid source: "${record.source}" (must be one of: ${VALID_SOURCES.join(', ')})`);
  }

  // ID validation (required if option set, otherwise optional but must be valid if present)
  if (requireId && (typeof record.id !== 'string' || record.id.length === 0)) {
    errors.push('Missing required field: id');
  }
  if (typeof record.id === 'string' && record.id.length > 0) {
    const idPattern = dataset === 'rag-injection' ? RAG_ID_PATTERN : PI_ID_PATTERN;
    if (!idPattern.test(record.id)) {
      const prefix = dataset === 'rag-injection' ? 'safepaste_rag_NNNNNN' : 'safepaste_pi_NNNNNN';
      errors.push(`Invalid id format: "${record.id}" (must match ${prefix})`);
    }
  }

  // Optional field validation
  if (record.expected_score_range !== undefined) {
    if (!Array.isArray(record.expected_score_range) ||
        record.expected_score_range.length !== 2 ||
        typeof record.expected_score_range[0] !== 'number' ||
        typeof record.expected_score_range[1] !== 'number') {
      errors.push('expected_score_range must be [number, number]');
    }
  }

  if (record.difficulty !== undefined && !VALID_DIFFICULTIES.includes(record.difficulty)) {
    errors.push(`Invalid difficulty: "${record.difficulty}" (must be easy or hard)`);
  }

  if (record.context_type !== undefined && !VALID_CONTEXT_TYPES.includes(record.context_type)) {
    errors.push(`Invalid context_type: "${record.context_type}" (must be one of: ${VALID_CONTEXT_TYPES.join(', ')})`);
  }

  if (record.partition !== undefined && !VALID_PARTITIONS.includes(record.partition)) {
    errors.push(`Invalid partition: "${record.partition}" (must be one of: ${VALID_PARTITIONS.join(', ')})`);
  }

  if (record.date_added !== undefined && typeof record.date_added !== 'string') {
    errors.push('date_added must be a string (ISO date)');
  }

  if (record.notes !== undefined && typeof record.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (record.mutation_type !== undefined && typeof record.mutation_type !== 'string') {
    errors.push('mutation_type must be a string');
  }

  if (record.parent_hash !== undefined && typeof record.parent_hash !== 'string') {
    errors.push('parent_hash must be a string');
  }

  if (record.timestamp !== undefined && typeof record.timestamp !== 'string') {
    errors.push('timestamp must be a string (ISO timestamp)');
  }

  // Telemetry records require timestamp
  if (record.source === 'telemetry' && typeof record.timestamp !== 'string') {
    errors.push('Telemetry records require a timestamp field');
  }

  // Scraped data requires metadata with provenance/licensing
  if (record.source === 'scraped') {
    if (!record.metadata || typeof record.metadata !== 'object') {
      errors.push('Scraped records require a metadata object with provenance fields');
    } else {
      if (typeof record.metadata.source_url !== 'string') {
        errors.push('Scraped metadata requires source_url (string)');
      }
      if (typeof record.metadata.license !== 'string') {
        errors.push('Scraped metadata requires license (string)');
      }
      if (typeof record.metadata.collection_method !== 'string') {
        errors.push('Scraped metadata requires collection_method (string)');
      }
      if (typeof record.metadata.original_author !== 'string') {
        errors.push('Scraped metadata requires original_author (string)');
      }
    }
  }

  // RAG-specific fields
  if (dataset === 'rag-injection' && record.label === 'attack') {
    if (record.document_type !== undefined && !VALID_RAG_DOC_TYPES.includes(record.document_type)) {
      errors.push(`Invalid document_type: "${record.document_type}"`);
    }
    if (record.injection_location !== undefined && !VALID_RAG_LOCATIONS.includes(record.injection_location)) {
      errors.push(`Invalid injection_location: "${record.injection_location}"`);
    }
  }

  return errors;
}

/**
 * Validate an array of records for ID uniqueness.
 *
 * @param {object[]} records - All records to check
 * @returns {string[]} Array of error messages about duplicate IDs
 */
function validateIdUniqueness(records) {
  const errors = [];
  const seen = new Map();

  for (let i = 0; i < records.length; i++) {
    const id = records[i].id;
    if (typeof id !== 'string' || id.length === 0) continue;

    if (seen.has(id)) {
      errors.push(`Duplicate id: "${id}" (records ${seen.get(id)} and ${i})`);
    } else {
      seen.set(id, i);
    }
  }

  return errors;
}

module.exports = {
  validateRecord,
  validateIdUniqueness,
  VALID_LABELS,
  VALID_SOURCES,
  VALID_DIFFICULTIES,
  VALID_CONTEXT_TYPES,
  VALID_PARTITIONS,
  PI_ID_PATTERN,
  RAG_ID_PATTERN
};
