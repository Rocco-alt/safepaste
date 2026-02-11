// server.js — SafePaste API
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { analyze } = require("./detector");
const { authenticateKey, generateKey, API_KEYS, initAuth } = require("./auth");
const { initDb } = require("./db");
const { createKey, revokeKey } = require("./key-manager");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Global rate limit: 100 requests per minute per IP (fallback safety net)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "rate_limit_exceeded", message: "Too many requests. Please slow down." }
  })
);

// ---------------------------------------------------------------------------
// Health check (no auth required)
// ---------------------------------------------------------------------------
app.get("/v1/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ---------------------------------------------------------------------------
// POST /v1/scan — Main detection endpoint
// ---------------------------------------------------------------------------
app.post("/v1/scan", authenticateKey, (req, res) => {
  const { text, options } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({
      error: "invalid_request",
      message: "Request body must include a 'text' field (string)."
    });
  }

  if (text.length === 0) {
    return res.status(400).json({
      error: "invalid_request",
      message: "The 'text' field must not be empty."
    });
  }

  if (text.length > 50_000) {
    return res.status(400).json({
      error: "text_too_long",
      message: "Text exceeds the 50,000 character limit."
    });
  }

  const opts = {
    strictMode: !!(options && options.strictMode)
  };

  const start = performance.now();
  const result = analyze(text, opts);
  const latencyMs = Math.round((performance.now() - start) * 100) / 100;

  res.json({
    ...result,
    meta: {
      ...result.meta,
      latencyMs
    }
  });
});

// ---------------------------------------------------------------------------
// POST /v1/scan/batch — Batch detection (up to 20 texts)
// ---------------------------------------------------------------------------
app.post("/v1/scan/batch", authenticateKey, (req, res) => {
  const { items, options } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Request body must include an 'items' array of strings."
    });
  }

  if (items.length === 0 || items.length > 20) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Batch must contain between 1 and 20 items."
    });
  }

  const opts = {
    strictMode: !!(options && options.strictMode)
  };

  const start = performance.now();

  const results = items.map((text, index) => {
    if (typeof text !== "string" || text.length === 0) {
      return { index, error: "invalid_item", message: "Item must be a non-empty string." };
    }
    if (text.length > 50_000) {
      return { index, error: "text_too_long", message: "Text exceeds the 50,000 character limit." };
    }
    return { index, ...analyze(text, opts) };
  });

  const latencyMs = Math.round((performance.now() - start) * 100) / 100;

  res.json({
    results,
    meta: { totalItems: items.length, latencyMs }
  });
});

// ---------------------------------------------------------------------------
// GET /v1/patterns — List available detection patterns (useful for docs)
// ---------------------------------------------------------------------------
app.get("/v1/patterns", authenticateKey, (_req, res) => {
  const { PATTERNS } = require("./detector");
  const summary = PATTERNS.map((p) => ({
    id: p.id,
    category: p.category,
    weight: p.weight,
    explanation: p.explanation
  }));
  res.json({ count: summary.length, patterns: summary });
});

// ---------------------------------------------------------------------------
// GET /v1/usage — Simple usage stats for the authenticated key
// ---------------------------------------------------------------------------
app.get("/v1/usage", authenticateKey, (req, res) => {
  const keyData = API_KEYS.get(req.apiKeyId);
  if (!keyData) {
    return res.json({ requests: 0 });
  }
  res.json({
    keyId: req.apiKeyId,
    plan: keyData.plan,
    rateLimit: keyData.rateLimit,
    requestsThisWindow: keyData.requestCount || 0
  });
});

// ---------------------------------------------------------------------------
// Admin auth helper
// ---------------------------------------------------------------------------
function validateAdminKey(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7).trim();
  const adminKey = process.env.SAFEPASTE_ADMIN_KEY || "sk_admin_dev_12345";
  return key === adminKey;
}

// ---------------------------------------------------------------------------
// POST /v1/keys — Create a new API key (admin only, requires database)
// ---------------------------------------------------------------------------
app.post("/v1/keys", async (req, res) => {
  if (!validateAdminKey(req)) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid admin key."
    });
  }

  const { id, plan, rateLimit: rl } = req.body;

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({
      error: "invalid_request",
      message: "Request body must include an 'id' field (non-empty string)."
    });
  }

  const keyString = generateKey("sp");
  const row = await createKey(id.trim(), keyString, plan || "free", rl || 60);

  if (!row) {
    return res.status(503).json({
      error: "service_unavailable",
      message: "Database unavailable. Key management requires PostgreSQL."
    });
  }

  // Add to in-memory cache immediately so it works right away
  API_KEYS.set(keyString, {
    id: row.id,
    plan: row.plan,
    rateLimit: row.rate_limit,
    requestCount: 0,
    windowStart: Date.now()
  });

  res.status(201).json({
    id: row.id,
    key: keyString,
    plan: row.plan,
    rateLimit: row.rate_limit,
    createdAt: row.created_at
  });
});

// ---------------------------------------------------------------------------
// DELETE /v1/keys/:id — Revoke an API key (admin only, requires database)
// ---------------------------------------------------------------------------
app.delete("/v1/keys/:id", async (req, res) => {
  if (!validateAdminKey(req)) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid admin key."
    });
  }

  const revoked = await revokeKey(req.params.id);

  if (revoked === null) {
    return res.status(503).json({
      error: "service_unavailable",
      message: "Database unavailable. Key management requires PostgreSQL."
    });
  }

  if (!revoked) {
    return res.status(404).json({
      error: "not_found",
      message: `No active key found with id '${req.params.id}'.`
    });
  }

  // Remove from in-memory cache so it stops working immediately
  for (const [keyString, keyData] of API_KEYS.entries()) {
    if (keyData.id === req.params.id) {
      API_KEYS.delete(keyString);
      break;
    }
  }

  res.json({ message: "Key revoked." });
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    error: "not_found",
    message: "Endpoint not found. See docs at /v1/health."
  });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "internal_error",
    message: "An unexpected error occurred."
  });
});

// ---------------------------------------------------------------------------
// Start (only when run directly, not when imported by tests)
// ---------------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    await initDb();
    await initAuth();
    app.listen(PORT, () => {
      console.log(`SafePaste API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/v1/health`);
    });
  })().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}

module.exports = app;
