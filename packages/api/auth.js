// auth.js — API key authentication + per-key rate limiting
//
// Keys are loaded from PostgreSQL on startup (if DATABASE_URL is set).
// Otherwise, falls back to env-var-based demo keys for local development.
// Rate limiting always runs in-memory (fast, ephemeral by design).

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// In-memory key store (cache for fast auth + rate limiting)
// Populated from PostgreSQL on startup, or from env vars as fallback.
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
// Seed keys from environment variables (with dev fallbacks)
// In production, set SAFEPASTE_DEMO_KEY and SAFEPASTE_PRO_KEY in your host
// (e.g. Railway Variables tab). Locally, the defaults work out of the box.
// ---------------------------------------------------------------------------
const DEMO_KEY = process.env.SAFEPASTE_DEMO_KEY || "sp_demo_key_12345";
const PRO_KEY  = process.env.SAFEPASTE_PRO_KEY  || "sp_pro_key_67890";

registerKey("demo", DEMO_KEY, { plan: "free", rateLimit: 30 });
registerKey("test-pro", PRO_KEY, { plan: "pro", rateLimit: 300 });

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

// ---------------------------------------------------------------------------
// Database-backed key loading (called from server.js on startup)
// ---------------------------------------------------------------------------
async function initAuth() {
  const { loadAllKeys } = require("./key-manager");
  const rows = await loadAllKeys();

  if (!rows) {
    // DB not available — the sync fallback keys above are already in the Map
    console.log("[Auth] Using in-memory fallback keys");
    return;
  }

  // Clear the sync fallback keys and load everything from the database
  API_KEYS.clear();
  for (const row of rows) {
    API_KEYS.set(row.key_string, {
      id: row.id,
      plan: row.plan,
      rateLimit: row.rate_limit,
      requestCount: 0,
      windowStart: Date.now()
    });
  }
  console.log(`[Auth] Loaded ${rows.length} key(s) from database`);
}

module.exports = { authenticateKey, registerKey, generateKey, API_KEYS, initAuth };
