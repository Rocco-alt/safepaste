// auth.js — API key authentication + per-key rate limiting
//
// In production, swap this for a database lookup (Postgres, Redis, etc.)
// For now, keys are stored in-memory for easy local development.

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// In-memory key store
// Replace with a real database in production.
// ---------------------------------------------------------------------------
const API_KEYS = new Map();

/**
 * Register an API key.
 * @param {string} id - A human-readable key identifier (e.g. "acme-corp")
 * @param {string} key - The actual API key string
 * @param {object} opts
 * @param {"free"|"pro"|"enterprise"} opts.plan
 * @param {number} opts.rateLimit - Requests per minute
 */
function registerKey(id, key, opts = {}) {
  API_KEYS.set(key, {
    id,
    plan: opts.plan || "free",
    rateLimit: opts.rateLimit || 60,
    requestCount: 0,
    windowStart: Date.now()
  });
}

// ---------------------------------------------------------------------------
// Seed some demo keys for development
// ---------------------------------------------------------------------------
registerKey("demo", "sp_demo_key_12345", { plan: "free", rateLimit: 30 });
registerKey("test-pro", "sp_pro_key_67890", { plan: "pro", rateLimit: 300 });

/**
 * Generate a new API key with the SafePaste prefix.
 * @param {string} prefix - Key prefix (default: "sp")
 * @returns {string}
 */
function generateKey(prefix = "sp") {
  const random = crypto.randomBytes(24).toString("base64url");
  return `${prefix}_${random}`;
}

// ---------------------------------------------------------------------------
// Per-key sliding window rate limiter
// ---------------------------------------------------------------------------
function checkRateLimit(keyData) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  // Reset window if expired
  if (now - keyData.windowStart > windowMs) {
    keyData.requestCount = 0;
    keyData.windowStart = now;
  }

  keyData.requestCount++;
  return keyData.requestCount <= keyData.rateLimit;
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------
function authenticateKey(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Use: Bearer <your-api-key>"
    });
  }

  const key = authHeader.slice(7).trim();
  const keyData = API_KEYS.get(key);

  if (!keyData) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid API key."
    });
  }

  if (!checkRateLimit(keyData)) {
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: `Rate limit of ${keyData.rateLimit} requests/minute exceeded for your plan (${keyData.plan}).`,
      retryAfterMs: 60_000 - (Date.now() - keyData.windowStart)
    });
  }

  // Attach key info to request for downstream use
  req.apiKeyId = keyData.id;
  req.apiKeyPlan = keyData.plan;

  next();
}

module.exports = { authenticateKey, registerKey, generateKey, API_KEYS };
