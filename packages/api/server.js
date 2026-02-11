// server.js — SafePaste API
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { analyze } = require("./detector");
const { authenticateKey, API_KEYS } = require("./auth");

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
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`SafePaste API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/v1/health`);
});

module.exports = app;
