# Dependency Map

## Inter-Package Dependencies

```
shared/ ──build──→ extension/   (via scripts/build-extension.js, one-way copy)
shared/ ──require──→ api/       (direct Node.js require)
```

Extension and API never depend on each other. Website is standalone.

## External Dependencies

### API (packages/api/package.json)

- express (4.21) — HTTP framework
- express-rate-limit — global IP-based rate limiting (fallback safety net)
- helmet — security headers
- cors — cross-origin support
- pg — PostgreSQL driver (optional, falls back to in-memory)
- stripe — billing integration (optional, disabled without STRIPE_SECRET_KEY)

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
