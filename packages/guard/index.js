/**
 * @module @safepaste/guard
 *
 * Agent runtime security middleware for AI tool pipelines.
 * Scans tool inputs and outputs for prompt injection using
 * @safepaste/core as a black box.
 *
 * Primary entry point: createGuard(options) returns a guard object
 * with scanInput, scanOutput, wrapTool, and wrapTools methods.
 */

'use strict';

var scan = require('./scan');
var modes = require('./modes');

/**
 * Perform a guarded scan on text.
 * @param {string} text - Text to scan
 * @param {string} point - 'input' or 'output'
 * @param {Object} ctx - Context { tool, strict, mode, on }
 * @returns {Object} GuardResult
 */
function guardScan(text, point, ctx) {
  var scannable = scan.toScannable(text);
  if (scannable === null) {
    return {
      flagged: false,
      action: 'pass',
      scan: { flagged: false, risk: 'low', score: 0, threshold: ctx.strict ? 25 : 35, matches: [], meta: {} },
      guard: { point: point, tool: ctx.tool || null, mode: ctx.modeStr, timestamp: Date.now(), durationMs: 0 }
    };
  }

  var scanData = scan.scanText(scannable, { strict: ctx.strict });
  var resolvedMode = modes.resolveMode(ctx.mode, point);
  var modeStr = typeof resolvedMode === 'function' ? 'callback' : resolvedMode;
  var guardResult = scan.buildGuardResult(scanData, modeStr, { point: point, tool: ctx.tool, mode: modeStr });

  // Fire detection callback
  if (guardResult.flagged && ctx.on && typeof ctx.on.detection === 'function') {
    try { ctx.on.detection(guardResult); } catch (e) { /* ignore callback errors */ }
  }

  // Apply mode
  try {
    modes.applyMode(guardResult, resolvedMode);
  } catch (e) {
    if (e.name === 'GuardError') {
      // Fire blocked callback
      if (ctx.on && typeof ctx.on.blocked === 'function') {
        try { ctx.on.blocked(guardResult); } catch (e2) { /* ignore */ }
      }
      throw e;
    }
    throw e;
  }

  return guardResult;
}

/**
 * Create a guard instance with the given options.
 *
 * @param {Object} [options] - Configuration
 * @param {string|Function|Object} [options.mode='warn'] - Mode: 'log', 'warn', 'block', function, or { input, output }
 * @param {boolean} [options.strict=false] - Use strict mode (threshold 25)
 * @param {Object} [options.on] - Event callbacks
 * @param {Function} [options.on.detection] - Called on every detection
 * @param {Function} [options.on.blocked] - Called when block prevents execution
 * @param {Function} [options.on.error] - Called on scanning failures
 * @returns {Object} Guard instance with scanInput, scanOutput, wrapTool, wrapTools
 */
function createGuard(options) {
  var opts = options || {};
  var mode = typeof opts.mode !== 'undefined' ? opts.mode : 'warn';
  var strict = !!opts.strict;
  var on = opts.on || {};

  var ctx = { strict: strict, mode: mode, on: on };

  return {
    /**
     * Scan tool input text.
     * @param {string} text - Text to scan
     * @param {Object} [scanCtx] - Context { tool }
     * @returns {Object} GuardResult
     */
    scanInput: function scanInput(text, scanCtx) {
      var c = scanCtx || {};
      return guardScan(text, 'input', {
        tool: c.tool, strict: strict, mode: mode, modeStr: typeof mode === 'function' ? 'callback' : (typeof mode === 'object' && mode !== null ? (mode.input || 'warn') : mode),
        on: on
      });
    },

    /**
     * Scan tool output text.
     * @param {string} text - Text to scan
     * @param {Object} [scanCtx] - Context { tool }
     * @returns {Object} GuardResult
     */
    scanOutput: function scanOutput(text, scanCtx) {
      var c = scanCtx || {};
      return guardScan(text, 'output', {
        tool: c.tool, strict: strict, mode: mode, modeStr: typeof mode === 'function' ? 'callback' : (typeof mode === 'object' && mode !== null ? (mode.output || 'warn') : mode),
        on: on
      });
    },

    /**
     * Wrap a standalone tool function. Scans input args and output result.
     * Calls fn with this=null — designed for standalone functions, not methods.
     * To wrap a method, bind it first: wrapTool('name', obj.method.bind(obj))
     * @param {string} name - Tool name
     * @param {Function} fn - Tool function (sync or async)
     * @returns {Function} Wrapped tool function
     */
    wrapTool: function wrapTool(name, fn) {
      var guardCtx = ctx;
      return function wrappedTool() {
        var args = arguments;

        // Scan input
        try {
          var inputText = args.length === 1 ? scan.toScannable(args[0]) : scan.toScannable(Array.prototype.slice.call(args));
          if (inputText !== null) {
            guardScan(inputText, 'input', {
              tool: name, strict: guardCtx.strict, mode: guardCtx.mode,
              modeStr: typeof guardCtx.mode === 'function' ? 'callback' : (typeof guardCtx.mode === 'object' && guardCtx.mode !== null ? (guardCtx.mode.input || 'warn') : guardCtx.mode),
              on: guardCtx.on
            });
          }
        } catch (e) {
          if (e.name === 'GuardError') { throw e; }
          // Fail-open: report error, continue
          if (guardCtx.on && typeof guardCtx.on.error === 'function') {
            try { guardCtx.on.error(e, { tool: name, point: 'input' }); } catch (e2) { /* ignore */ }
          }
        }

        // Call original function
        var result;
        try {
          result = fn.apply(null, args);
        } catch (e) {
          throw e;
        }

        // If result is a Promise, scan output after resolution
        if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
          return result.then(function (resolved) {
            try {
              var outputText = scan.toScannable(resolved);
              if (outputText !== null) {
                guardScan(outputText, 'output', {
                  tool: name, strict: guardCtx.strict, mode: guardCtx.mode,
                  modeStr: typeof guardCtx.mode === 'function' ? 'callback' : (typeof guardCtx.mode === 'object' && guardCtx.mode !== null ? (guardCtx.mode.output || 'warn') : guardCtx.mode),
                  on: guardCtx.on
                });
              }
            } catch (e) {
              if (e.name === 'GuardError') { throw e; }
              if (guardCtx.on && typeof guardCtx.on.error === 'function') {
                try { guardCtx.on.error(e, { tool: name, point: 'output' }); } catch (e2) { /* ignore */ }
              }
            }
            return resolved;
          });
        }

        // Sync result — scan output
        try {
          var outputText = scan.toScannable(result);
          if (outputText !== null) {
            guardScan(outputText, 'output', {
              tool: name, strict: guardCtx.strict, mode: guardCtx.mode,
              modeStr: typeof guardCtx.mode === 'function' ? 'callback' : (typeof guardCtx.mode === 'object' && guardCtx.mode !== null ? (guardCtx.mode.output || 'warn') : guardCtx.mode),
              on: guardCtx.on
            });
          }
        } catch (e) {
          if (e.name === 'GuardError') { throw e; }
          if (guardCtx.on && typeof guardCtx.on.error === 'function') {
            try { guardCtx.on.error(e, { tool: name, point: 'output' }); } catch (e2) { /* ignore */ }
          }
        }

        return result;
      };
    },

    /**
     * Wrap all functions in a plain { name: fn } tool map.
     * Copies only own enumerable properties — functions are wrapped,
     * non-functions are copied by reference. Returns a new object.
     * @param {Object} toolMap - { name: fn, ... }
     * @returns {Object} New object with wrapped functions
     */
    wrapTools: function wrapTools(toolMap) {
      var wrapped = {};
      var keys = Object.keys(toolMap);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (typeof toolMap[key] === 'function') {
          wrapped[key] = this.wrapTool(key, toolMap[key]);
        } else {
          wrapped[key] = toolMap[key];
        }
      }
      return wrapped;
    }
  };
}

/**
 * Scan tool input text (standalone, always mode=log).
 * @param {string} text - Text to scan
 * @param {Object} [options] - { tool, strict }
 * @returns {Object} GuardResult
 */
function scanToolInput(text, options) {
  var opts = options || {};
  return guardScan(text, 'input', {
    tool: opts.tool, strict: !!opts.strict, mode: 'log', modeStr: 'log', on: {}
  });
}

/**
 * Scan tool output text (standalone, always mode=log).
 * @param {string} text - Text to scan
 * @param {Object} [options] - { tool, strict }
 * @returns {Object} GuardResult
 */
function scanToolOutput(text, options) {
  var opts = options || {};
  return guardScan(text, 'output', {
    tool: opts.tool, strict: !!opts.strict, mode: 'log', modeStr: 'log', on: {}
  });
}

module.exports = {
  createGuard: createGuard,
  scanToolInput: scanToolInput,
  scanToolOutput: scanToolOutput
};
