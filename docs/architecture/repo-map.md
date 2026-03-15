# Repository Map

## Package Overview

| Package | Purpose | Entry Point | Key Files |
|---------|---------|-------------|-----------|
| packages/core/ | Detection engine (source of truth) | detect.js | detect.js, patterns.js |
| packages/test/ | Attack simulation CLI | cli.js | cli.js, index.js, payloads.js, inject.js, format.js |
| packages/guard/ | Agent runtime security middleware | index.js | index.js, scan.js, modes.js |
| packages/api/ | REST API server | server.js | server.js, auth.js, detector.js, db.js, billing.js, key-manager.js |
| packages/extension/ | Chrome Manifest v3 extension | content.js | content.js, detector.js, background.js, popup.js, settings.js, ui.css |
| packages/website/ | Landing page + docs | server.js | server.js, index.html, docs.html |

## Generated Files (DO NOT EDIT)

- `packages/extension/detect-core.js` — generated from `packages/core/detect.js`
- `packages/extension/patterns.js` — generated from `packages/core/patterns.js`
- Regenerate: `npm run build:extension`

## Entry Points

- **API server:** `npm start` → packages/api/server.js (port 3000)
- **Website:** `node packages/website/server.js` (port 3001)
- **Extension:** loaded by Chrome from packages/extension/manifest.json
- **Attack simulation CLI:** `node packages/test/cli.js <prompt>` or `npx safepaste-test`
- **Tests:** `npm test` → core/test.js + test/test.js + guard/test.js + api/test.js
- **Build:** `npm run build:extension` → scripts/build-extension.js

## Database Schema (packages/api/db.js)

**api_keys table:**
- id (VARCHAR 100, PK)
- key_string (VARCHAR 255, UNIQUE)
- plan (VARCHAR 50, default 'free')
- rate_limit (INT, default 60)
- created_at (TIMESTAMP)
- revoked_at (TIMESTAMP, nullable)

**customers table** (created by billing.js):
- id, email, stripe_customer_id, stripe_session_id, api_key_id, api_key_string, plan, created_at

## Key File Count

~5,100 lines of vanilla JavaScript across 6 packages.
