/**
 * @module @safepaste/test
 *
 * Attack simulation engine for testing prompt injection detection.
 * Generates adversarial variants by injecting known attack payloads
 * into a target prompt, scans each with @safepaste/core, and reports
 * which attacks were detected.
 *
 * Treats @safepaste/core as a black box: text in, { flagged, score, risk } out.
 */

'use strict';

var payloadsModule = require('./payloads');
var PAYLOADS = payloadsModule.PAYLOADS;
var CATEGORIES = payloadsModule.CATEGORIES;
var inject = require('./inject');
var STRATEGIES = inject.STRATEGIES;

/**
 * Resolve @safepaste/core: try npm first, monorepo fallback.
 * @returns {Object} The core module
 */
function resolveCore() {
  try {
    return require('@safepaste/core');
  } catch (e) {
    return require('../core');
  }
}

/**
 * Run attack simulation against a target prompt.
 *
 * @param {string} prompt - The target prompt to test
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.strict=false] - Use strict mode (threshold 25 instead of 35)
 * @param {string[]} [options.categories] - Filter to specific categories
 * @param {number} [options.passThreshold=0.8] - Minimum detection rate for pass (0-1)
 * @returns {{ pass: boolean, prompt: string, config: Object, summary: Object, categories: Object, variants: Array }}
 */
function run(prompt, options) {
  var opts = options || {};
  var core = resolveCore();

  var strict = !!opts.strict;
  var passThreshold = typeof opts.passThreshold === 'number' ? opts.passThreshold : 0.8;

  // Select categories
  var selectedCategories = opts.categories || CATEGORIES;
  // Validate categories
  var validCategories = [];
  for (var i = 0; i < selectedCategories.length; i++) {
    if (PAYLOADS[selectedCategories[i]]) {
      validCategories.push(selectedCategories[i]);
    }
  }

  if (validCategories.length === 0) {
    throw new Error('No valid categories selected');
  }

  // Collect payloads
  var selectedPayloads = [];
  for (var c = 0; c < validCategories.length; c++) {
    var catPayloads = PAYLOADS[validCategories[c]];
    for (var p = 0; p < catPayloads.length; p++) {
      selectedPayloads.push(catPayloads[p]);
    }
  }

  // Generate and scan variants
  var allVariants = [];
  var categoryStats = {};

  for (var v = 0; v < selectedPayloads.length; v++) {
    var variants = inject.generateVariants(prompt, selectedPayloads[v]);

    for (var vi = 0; vi < variants.length; vi++) {
      var variant = variants[vi];
      var result = core.scanPrompt(variant.text, { strictMode: strict });

      var variantResult = {
        category: variant.category,
        strategy: variant.strategy,
        payloadId: variant.payloadId,
        text: variant.text,
        flagged: result.flagged,
        score: result.score,
        risk: result.risk
      };
      allVariants.push(variantResult);

      // Update category stats
      if (!categoryStats[variant.category]) {
        categoryStats[variant.category] = { total: 0, detected: 0 };
      }
      categoryStats[variant.category].total++;
      if (result.flagged) {
        categoryStats[variant.category].detected++;
      }
    }
  }

  // Compute summary
  var totalVariants = allVariants.length;
  var detectedCount = 0;
  for (var d = 0; d < allVariants.length; d++) {
    if (allVariants[d].flagged) detectedCount++;
  }
  var rate = totalVariants > 0 ? detectedCount / totalVariants : 0;
  var pass = rate >= passThreshold;

  var threshold = strict ? 25 : 35;

  return {
    pass: pass,
    prompt: prompt,
    config: {
      threshold: threshold,
      categories: validCategories.length,
      passThreshold: passThreshold,
      strict: strict
    },
    summary: {
      total: totalVariants,
      detected: detectedCount,
      missed: totalVariants - detectedCount,
      rate: Math.round(rate * 1000) / 1000,
      pass: pass
    },
    categories: categoryStats,
    variants: allVariants
  };
}

module.exports = {
  run: run,
  PAYLOADS: PAYLOADS,
  CATEGORIES: CATEGORIES,
  STRATEGIES: STRATEGIES
};
