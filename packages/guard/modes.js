/**
 * @module modes
 *
 * Mode handlers for @safepaste/guard.
 * Each mode determines what happens when a detection occurs:
 * log (no-op), warn (console.warn), block (throw), callback (user function).
 */

'use strict';

/**
 * Create a GuardError with the given message and guardResult.
 * @param {string} message - Error message
 * @param {Object} guardResult - The GuardResult that triggered the block
 * @returns {Error} Error with name='GuardError' and guardResult attached
 */
function createGuardError(message, guardResult) {
  var err = new Error(message);
  err.name = 'GuardError';
  err.guardResult = guardResult;
  return err;
}

/**
 * Resolve mode for a given scan direction.
 * @param {string|Object|Function} modeOption - Mode config from createGuard
 * @param {string} point - 'input' or 'output'
 * @returns {string|Function} Resolved mode for this direction
 */
function resolveMode(modeOption, point) {
  if (typeof modeOption === 'function') {
    return modeOption;
  }
  if (typeof modeOption === 'object' && modeOption !== null && typeof modeOption[point] !== 'undefined') {
    return modeOption[point];
  }
  if (typeof modeOption === 'string') {
    return modeOption;
  }
  return 'warn';
}

/**
 * Handle log mode — return result, no side effects.
 * @param {Object} guardResult - The GuardResult
 * @returns {Object} guardResult unchanged
 */
function handleLog(guardResult) {
  return guardResult;
}

/**
 * Handle warn mode — console.warn if flagged, return result.
 * @param {Object} guardResult - The GuardResult
 * @returns {Object} guardResult unchanged
 */
function handleWarn(guardResult) {
  if (guardResult.flagged) {
    var tool = guardResult.guard.tool ? ' (' + guardResult.guard.tool + ')' : '';
    console.warn('[SafePaste Guard] Prompt injection detected in ' + guardResult.guard.point + tool +
      ' — risk: ' + guardResult.scan.risk + ', score: ' + guardResult.scan.score);
  }
  return guardResult;
}

/**
 * Handle block mode — throw GuardError if flagged.
 * @param {Object} guardResult - The GuardResult
 * @returns {Object} guardResult if not flagged
 * @throws {Error} GuardError if flagged
 */
function handleBlock(guardResult) {
  if (guardResult.flagged) {
    var tool = guardResult.guard.tool ? ' (' + guardResult.guard.tool + ')' : '';
    throw createGuardError(
      'Prompt injection blocked in ' + guardResult.guard.point + tool +
      ' — risk: ' + guardResult.scan.risk + ', score: ' + guardResult.scan.score,
      guardResult
    );
  }
  return guardResult;
}

/**
 * Handle callback mode — call user function, throw if it returns false.
 * @param {Object} guardResult - The GuardResult
 * @param {Function} callbackFn - User-provided callback
 * @returns {Object} guardResult if callback doesn't return false
 * @throws {Error} GuardError if callback returns false
 */
function handleCallback(guardResult, callbackFn) {
  if (guardResult.flagged) {
    var decision = callbackFn(guardResult);
    if (decision === false) {
      var tool = guardResult.guard.tool ? ' (' + guardResult.guard.tool + ')' : '';
      throw createGuardError(
        'Prompt injection blocked by callback in ' + guardResult.guard.point + tool,
        guardResult
      );
    }
  }
  return guardResult;
}

/**
 * Apply the resolved mode to a guard result.
 * @param {Object} guardResult - The GuardResult
 * @param {string|Function} mode - Resolved mode
 * @returns {Object} guardResult (may throw for block/callback)
 */
function applyMode(guardResult, mode) {
  if (!guardResult.flagged) {
    guardResult.action = 'pass';
    return guardResult;
  }
  if (typeof mode === 'function') {
    guardResult.action = 'callback';
    return handleCallback(guardResult, mode);
  }
  if (mode === 'block') {
    guardResult.action = 'block';
    return handleBlock(guardResult);
  }
  if (mode === 'warn') {
    guardResult.action = 'warn';
    return handleWarn(guardResult);
  }
  guardResult.action = 'log';
  return handleLog(guardResult);
}

module.exports = {
  createGuardError: createGuardError,
  resolveMode: resolveMode,
  handleLog: handleLog,
  handleWarn: handleWarn,
  handleBlock: handleBlock,
  handleCallback: handleCallback,
  applyMode: applyMode
};
