# Data Flow

## Extension Detection Flow

```
paste event on AI chat site
  → content.js intercepts (paste or beforeinput event)
  → extract clipboard text (or post-paste text diff for fallback sites)
  → detector.js: spAnalyze(text)
    → SafePasteCore.normalizeText(text)
      → NFKC normalize, remove zero-width chars, collapse whitespace, lowercase
    → SafePasteCore.findMatches(normalized, SAFEPASTE_PATTERNS)
      → test all 19 regex patterns against normalized text
    → SafePasteCore.computeScore(matches)
      → sum matched pattern weights, cap at 100
    → SafePasteCore.isBenignContext(normalized)
      → check for educational/demo/research framing
    → SafePasteCore.applyDampening(score, benign, hasExfiltration)
      → 0.75x score if benign AND no exfiltration patterns
    → compare against threshold (35 normal, 25 strict, 60 red-only)
  → if flagged: show warning modal (red for high risk, yellow for medium)
  → user choice: Cancel (block paste) or Paste Anyway (allow)
```

## API Detection Flow

```
POST /v1/scan with Bearer token
  → auth.js: authenticateKey middleware
    → validate key format (sp_ prefix for user, sk_admin_ for admin)
    → check per-key sliding window rate limit (60s window)
  → detector.js: analyze(text, options)
    → same detection pipeline as extension (uses shared/ directly via require)
  → respond with { flagged, risk, score, threshold, matches, categories, meta }
```

## Shared Code Sync Flow

```
packages/core/detect.js + patterns.js (authoritative source)
  → npm run build:extension (scripts/build-extension.js)
  → generates packages/extension/detect-core.js (IIFE wrapping, window.SafePasteCore)
  → generates packages/extension/patterns.js (IIFE wrapping, window.SAFEPASTE_PATTERNS)

API imports shared/ directly: require('../shared/detect'), require('../shared/patterns')
```

## Auth and Billing Flow

```
Stripe checkout → webhook (checkout.session.completed) → provision Pro API key → store in DB + memory cache
Free signup → POST /v1/signup → generate sp_ key → store in DB + memory cache
All keys cached in in-memory Map for fast auth lookup
DB is optional: without DATABASE_URL, falls back to env var demo/pro keys
```
