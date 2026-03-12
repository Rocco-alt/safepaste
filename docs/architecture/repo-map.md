# Repository Map

## Package Overview

| Package | Purpose | Entry Point | Key Files |
|---------|---------|-------------|-----------|
| packages/shared/ | Detection engine (source of truth) | detect.js | detect.js, patterns.js |
| packages/api/ | REST API server | server.js | server.js, auth.js, detector.js, db.js, billing.js, key-manager.js |
| packages/extension/ | Chrome Manifest v3 extension | content.js | content.js, detector.js, background.js, popup.js, settings.js, ui.css |
| packages/website/ | Landing page + docs | server.js | server.js, index.html, docs.html |

## Generated Files (DO NOT EDIT)

- `packages/extension/detect-core.js` — generated from `packages/shared/detect.js`
- `packages/extension/patterns.js` — generated from `packages/shared/patterns.js`
- Regenerate: `npm run build:extension`

## Entry Points

- **API server:** `npm start` → packages/api/server.js (port 3000)
- **Website:** `node packages/website/server.js` (port 3001)
- **Extension:** loaded by Chrome from packages/extension/manifest.json
- **Tests:** `npm test` → packages/api/test.js
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

~2,800 lines of vanilla JavaScript across 4 packages.
