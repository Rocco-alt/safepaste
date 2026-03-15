// jsonl-file.js — Adapter for importing records from local JSONL files
//
// Primary ingestion path for arbitrary external datasets (GitHub repos,
// academic datasets, CSV exports converted to JSONL, etc.).

'use strict';

const path = require('path');
const { readJsonl } = require('../lib/io');

module.exports = {
  name: 'jsonl-file',

  /**
   * Read records from a local JSONL file.
   *
   * @param {string} source - Path to the .jsonl file
   * @param {object} config - Adapter config (limit from CLI)
   * @param {number} [config.limit] - Max records to return
   * @returns {{ records: object[], sourceUrl: string }}
   */
  async fetch(source, config = {}) {
    const resolved = path.resolve(source);
    let records = readJsonl(resolved);

    if (config.limit && config.limit > 0) {
      records = records.slice(0, config.limit);
    }

    return {
      records,
      sourceUrl: 'file://' + resolved,
      collectionMethod: 'jsonl_file_import'
    };
  }
};
