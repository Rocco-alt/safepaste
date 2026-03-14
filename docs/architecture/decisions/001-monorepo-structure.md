# ADR-001: Monorepo with Shared Detection Engine

**Date:** 2026-01-15
**Status:** accepted

## Context

SafePaste has two delivery mechanisms — a Chrome extension and a REST API — that both need the same prompt injection detection logic. The detection engine (regex patterns + scoring + dampening) must stay identical across both. We needed a code organization strategy that prevents detection logic from diverging.

## Decision

Use a monorepo with four packages under `packages/`. The detection engine lives in `packages/core/` as the single source of truth. The API imports it directly via `require()`. The extension gets a copy via a build script (`scripts/build-extension.js`) that wraps the shared code in IIFEs for browser use.

## Alternatives Considered

- **Separate repositories:** One repo per package — rejected because keeping detection logic in sync across repos would require publishing an npm package and coordinating version bumps. Too much overhead for a solo developer.
- **npm package for shared code:** Publish `@safepaste/detection` to npm — rejected because it adds publishing/versioning complexity and a public registry dependency. The build script is simpler and sufficient.
- **Copy-paste shared code:** Manually keep both copies in sync — rejected because it would inevitably diverge, creating detection inconsistencies between extension and API.

## Consequences

- Positive: Single source of truth for detection logic. One `npm run build:extension` syncs everything.
- Positive: Simple to navigate — all code in one repo.
- Negative: Build step required after editing shared code (easy to forget).
- Negative: Extension gets generated files that must not be edited directly.

## Affected Files

- packages/core/detect.js, packages/core/patterns.js (source of truth)
- packages/extension/detect-core.js, packages/extension/patterns.js (generated)
- scripts/build-extension.js (build script)
- packages/api/detector.js (imports shared/ directly)
