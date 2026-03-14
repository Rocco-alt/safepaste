#!/usr/bin/env node

/**
 * safepaste-test — Attack simulation CLI
 *
 * Generates prompt injection test cases by injecting known attack payloads
 * into a target prompt, scans each variant, and reports detection results.
 *
 * Usage:
 *   safepaste-test <prompt>
 *   safepaste-test --file <path>
 *   echo "prompt" | safepaste-test
 *
 * Exit codes:
 *   0  Detection rate >= pass threshold
 *   1  Detection rate < pass threshold
 *   2  Usage error
 */

'use strict';

var fs = require('fs');
var path = require('path');
var testModule = require('./index');
var format = require('./format');
var VERSION = require('./package.json').version;

var HELP = [
  'Usage:',
  '  safepaste-test <prompt>',
  '  safepaste-test --file <path>',
  '  echo "prompt" | safepaste-test',
  '',
  'Options:',
  '  --format <report|json|jsonl>   Output format (default: report)',
  '  --strict                       Strict mode (threshold 25)',
  '  --categories <cat1,cat2,...>    Test specific categories',
  '  --pass-threshold <N>           Min detection rate 0-1 (default: 0.8)',
  '  --file <path>                  Read prompt from file',
  '  --help                         Show help',
  '  --version                      Show version',
  '',
  'Exit codes:',
  '  0  Detection rate >= pass threshold',
  '  1  Detection rate < pass threshold',
  '  2  Usage error',
  '',
  'Categories:',
  '  ' + testModule.CATEGORIES.join(', ')
].join('\n');

/**
 * Parse CLI arguments.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Object} Parsed options
 */
function parseArgs(argv) {
  var opts = {
    prompt: null,
    file: null,
    format: 'report',
    strict: false,
    categories: null,
    passThreshold: 0.8,
    help: false,
    version: false
  };
  var positionals = [];

  for (var i = 0; i < argv.length; i++) {
    var arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--version' || arg === '-v') {
      opts.version = true;
    } else if (arg === '--strict') {
      opts.strict = true;
    } else if (arg === '--format') {
      i++;
      if (!argv[i]) {
        throw new Error('--format requires a value (report, json, jsonl)');
      }
      if (argv[i] !== 'report' && argv[i] !== 'json' && argv[i] !== 'jsonl') {
        throw new Error('Invalid format: ' + argv[i] + '. Use report, json, or jsonl.');
      }
      opts.format = argv[i];
    } else if (arg === '--categories') {
      i++;
      if (!argv[i]) {
        throw new Error('--categories requires a comma-separated list');
      }
      opts.categories = argv[i].split(',').map(function (s) { return s.trim(); });
    } else if (arg === '--pass-threshold') {
      i++;
      if (!argv[i]) {
        throw new Error('--pass-threshold requires a numeric value (0-1)');
      }
      var val = parseFloat(argv[i]);
      if (isNaN(val) || val < 0 || val > 1) {
        throw new Error('--pass-threshold must be a number between 0 and 1');
      }
      opts.passThreshold = val;
    } else if (arg === '--file') {
      i++;
      if (!argv[i]) {
        throw new Error('--file requires a path');
      }
      opts.file = argv[i];
    } else if (arg.startsWith('--')) {
      throw new Error('Unknown flag: ' + arg);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length > 0) {
    opts.prompt = positionals.join(' ');
  }

  return opts;
}

/**
 * Read prompt from file, stdin, or positional argument.
 * @param {Object} opts - Parsed options
 * @returns {string} The prompt text
 */
function resolvePrompt(opts) {
  if (opts.file) {
    var filePath = path.resolve(opts.file);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  if (opts.prompt) {
    return opts.prompt;
  }

  // Try stdin
  if (!process.stdin.isTTY) {
    var input = fs.readFileSync(0, 'utf8').trim();
    if (input.length > 0) {
      return input;
    }
  }

  return null;
}

function main() {
  var opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write('Error: ' + e.message + '\n');
    process.exit(2);
  }

  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (opts.version) {
    console.log('safepaste-test v' + VERSION);
    process.exit(0);
  }

  var prompt;
  try {
    prompt = resolvePrompt(opts);
  } catch (e) {
    process.stderr.write('Error: ' + e.message + '\n');
    process.exit(2);
  }

  if (!prompt) {
    process.stderr.write('Error: No prompt provided. Use --help for usage.\n');
    process.exit(2);
  }

  var report;
  try {
    report = testModule.run(prompt, {
      strict: opts.strict,
      categories: opts.categories,
      passThreshold: opts.passThreshold
    });
  } catch (e) {
    process.stderr.write('Error: ' + e.message + '\n');
    process.exit(2);
  }

  // Output
  var output;
  if (opts.format === 'json') {
    output = format.formatJson(report);
  } else if (opts.format === 'jsonl') {
    output = format.formatJsonl(report);
  } else {
    output = format.formatReport(report);
  }
  console.log(output);

  process.exit(report.pass ? 0 : 1);
}

// Export parseArgs for testing
module.exports = { parseArgs: parseArgs, resolvePrompt: resolvePrompt };

if (require.main === module) {
  main();
}
