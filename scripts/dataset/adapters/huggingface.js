// huggingface.js — Adapter for fetching records from HuggingFace datasets API
//
// Uses the datasets-server REST API. No new dependencies — built-in https only.

'use strict';

const https = require('https');

const PAGE_SIZE = 100;
const BASE_URL = 'https://datasets-server.huggingface.co';

/**
 * Make an HTTPS GET request and return parsed JSON.
 *
 * @param {string} url - Full URL to fetch
 * @returns {Promise<object>} Parsed JSON response
 */
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          reject(new Error(
            `HuggingFace API returned HTTP ${res.statusCode}: ${body.slice(0, 500)}`
          ));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`Failed to parse HuggingFace API response: ${err.message}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  name: 'huggingface',

  /**
   * Fetch records from a HuggingFace dataset.
   *
   * @param {string} source - Dataset identifier (e.g. "deepset/prompt-injections")
   * @param {object} config - Adapter config
   * @param {string} [config.split='train'] - Dataset split
   * @param {string} [config.hfConfig='default'] - Dataset config
   * @param {number} [config.limit] - Max records to fetch
   * @returns {Promise<{ records: object[], sourceUrl: string }>}
   */
  async fetch(source, config = {}) {
    const split = config.split || 'train';
    const hfConfig = config.hfConfig || 'default';
    const limit = config.limit || Infinity;

    const records = [];
    let offset = 0;

    while (records.length < limit) {
      const length = Math.min(PAGE_SIZE, limit - records.length);
      const url = `${BASE_URL}/rows?dataset=${encodeURIComponent(source)}` +
        `&config=${encodeURIComponent(hfConfig)}` +
        `&split=${encodeURIComponent(split)}` +
        `&offset=${offset}&length=${length}`;

      const data = await httpsGetJson(url);

      // Validate response structure
      if (!data || !Array.isArray(data.rows)) {
        const shape = data ? Object.keys(data).join(', ') : typeof data;
        throw new Error(
          `Unexpected HuggingFace API response: expected { rows: [{ row: {...} }] }, ` +
          `got { ${shape} }`
        );
      }

      if (data.rows.length === 0) break;

      for (const entry of data.rows) {
        if (!entry || typeof entry.row !== 'object') {
          throw new Error(
            `Unexpected HuggingFace API response: expected { rows: [{ row: {...} }] }, ` +
            `got row entry without .row property`
          );
        }
        const row = entry.row;
        // Normalize binary classification labels (HuggingFace convention)
        if (row.label === 0) row.label = 'benign';
        else if (row.label === 1) row.label = 'attack';
        records.push(row);
      }

      offset += data.rows.length;

      // If we got fewer rows than a full page, we've reached the end
      if (data.rows.length < PAGE_SIZE) break;
    }

    return {
      records,
      sourceUrl: `https://huggingface.co/datasets/${source}`,
      collectionMethod: 'huggingface_api'
    };
  }
};
