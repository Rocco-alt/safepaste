# Dependency Map

## Inter-Package Dependencies

```
core/ ──build──→ extension/   (via scripts/build-extension.js, one-way copy)
core/ ──require──→ api/       (direct Node.js require)
core/ ──require──→ test/      (peer dependency, black-box scanPrompt() calls)
core/ ──require──→ guard/     (peer dependency, black-box scanPrompt() calls)
```

Extension, API, test, and guard never depend on each other. Website is standalone.

## External Dependencies

### API (packages/api/package.json)

- express (4.21) — HTTP framework
- express-rate-limit — global IP-based rate limiting (fallback safety net)
- helmet — security headers
- cors — cross-origin support
- pg — PostgreSQL driver (optional, falls back to in-memory)
- stripe — billing integration (optional, disabled without STRIPE_SECRET_KEY)

### Test CLI (packages/test/package.json)

- @safepaste/core (peer dependency, >=0.3.0)
- No other npm dependencies (zero runtime deps)

### Guard Middleware (packages/guard/package.json)

- @safepaste/core (peer dependency, >=0.3.0)
- No other npm dependencies (zero runtime deps)

### Extension

- Chrome Manifest v3 APIs: storage, activeTab
- No npm dependencies (pure browser JavaScript)

### Website

- express — static file serving only

## External Services

| Service | Required? | Used For | Fallback |
|---------|-----------|----------|----------|
| PostgreSQL | No | API key persistence | In-memory demo keys from env vars |
| Stripe | No | Pro tier billing | Billing endpoints disabled |
| Chrome Web Store | No | Extension distribution | Manual install via developer mode |
