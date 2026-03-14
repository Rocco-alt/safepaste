/**
 * @module @safepaste/test/format
 *
 * Output formatters for attack simulation results.
 * Three formats: human-readable report, JSON, and JSONL.
 * All pure functions returning strings. No ANSI colors.
 */

'use strict';

var VERSION = require('./package.json').version;

/**
 * Truncate a string to maxLen chars, adding "..." if truncated.
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * Generate a progress bar using block characters.
 * @param {number} ratio - Value between 0 and 1
 * @param {number} width - Bar width in characters
 * @returns {string}
 */
function progressBar(ratio, width) {
  var filled = Math.round(ratio * width);
  var bar = '';
  for (var i = 0; i < filled; i++) bar += '\u2588';
  return bar;
}

/**
 * Format as human-readable report.
 * @param {Object} report - Report from run()
 * @returns {string}
 */
function formatReport(report) {
  var lines = [];
  lines.push('SafePaste Attack Simulation');
  lines.push('=' .repeat(60));
  lines.push('Target: "' + truncate(report.prompt, 57) + '"');
  lines.push('Categories: ' + report.config.categories + ' | Variants: ' + report.summary.total + ' | Threshold: ' + report.config.threshold);
  lines.push('');

  var catKeys = Object.keys(report.categories);
  for (var i = 0; i < catKeys.length; i++) {
    var cat = catKeys[i];
    var data = report.categories[cat];
    var pct = data.total > 0 ? Math.round(data.detected / data.total * 100) : 0;
    var ratioStr = data.detected + '/' + data.total;
    var bar = progressBar(data.detected / data.total, 12);
    lines.push('  ' + cat.padEnd(28) + ratioStr.padStart(5) + ('  ' + pct + '%').padStart(5) + '  ' + bar);
  }

  // Missed variants
  var missed = [];
  for (var j = 0; j < report.variants.length; j++) {
    if (!report.variants[j].flagged) {
      missed.push(report.variants[j]);
    }
  }

  if (missed.length > 0) {
    lines.push('');
    lines.push('Missed (' + missed.length + '):');
    for (var k = 0; k < missed.length; k++) {
      var v = missed[k];
      var snippet = truncate(v.text, 40);
      lines.push('  ' + v.category + '/' + v.strategy + '  score=' + v.score + '  "' + snippet + '"');
    }
  }

  lines.push('');
  var passStr = report.summary.pass ? 'PASS' : 'FAIL';
  var rateStr = (report.summary.rate * 100).toFixed(1);
  var threshStr = (report.config.passThreshold * 100).toFixed(0);
  lines.push('Result: ' + passStr + '  ' + report.summary.detected + '/' + report.summary.total + ' detected (' + rateStr + '% >= ' + threshStr + '% threshold)');

  return lines.join('\n');
}

/**
 * Format as a single JSON object.
 * @param {Object} report - Report from run()
 * @returns {string}
 */
function formatJson(report) {
  return JSON.stringify({
    version: VERSION,
    prompt: report.prompt,
    config: report.config,
    summary: report.summary,
    categories: report.categories,
    variants: report.variants.map(function (v) {
      return {
        category: v.category,
        strategy: v.strategy,
        payloadId: v.payloadId,
        flagged: v.flagged,
        score: v.score,
        risk: v.risk
      };
    })
  }, null, 2);
}

/**
 * Format as JSONL (one JSON object per line per variant).
 * @param {Object} report - Report from run()
 * @returns {string}
 */
function formatJsonl(report) {
  var lines = [];
  for (var i = 0; i < report.variants.length; i++) {
    var v = report.variants[i];
    lines.push(JSON.stringify({
      category: v.category,
      strategy: v.strategy,
      payloadId: v.payloadId,
      flagged: v.flagged,
      score: v.score,
      risk: v.risk
    }));
  }
  return lines.join('\n');
}

module.exports = {
  formatReport: formatReport,
  formatJson: formatJson,
  formatJsonl: formatJsonl
};
