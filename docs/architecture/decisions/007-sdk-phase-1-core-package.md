# ADR-007: SDK Phase 1 — @safepaste/core Package

**Date:** 2026-03-14
**Status:** accepted
**Supersedes:** ADR-006

## Context

SafePaste's detection engine existed in `packages/shared/` as two plain JavaScript files with no `package.json`, consumed by the API via `require()` and the extension via a build script. Three independent copies of the detection orchestration logic existed: `packages/api/detector.js`, `scripts/dataset/evaluate.js`, and `scripts/dataset/diagnose.js`.

The SDK roadmap Phase 1 called for packaging the detection engine as a standalone npm package that any JavaScript application can import.

## Decision

1. **Rename `packages/shared/` to `packages/core/`** with full `package.json`, `index.js` entry point, JSDoc documentation, and 92 standalone unit tests.

2. **Publish as `@safepaste/core` v0.1.0** — pre-1.0 version signals the SDK interface may evolve.

3. **Add `scanPrompt(text, options)` as the primary SDK interface** in `packages/core/index.js`. This function composes all 8 low-level detection functions into a single call returning `{ flagged, risk, score, threshold, matches[], meta{} }`.

4. **CommonJS only** — no ESM dual-publish. Consistent with ADR-002 (vanilla JS, no build tools). ESM can be added as a future major version if needed.

5. **`categories` grouping stays in the API layer** — `scanPrompt()` returns flat `matches[]`. Category grouping is a presentation concern specific to the API response format, not a core detection operation.

6. **All `meta` fields are part of the stable public API surface** — `rawScore`, `dampened`, `benignContext`, `ocrDetected`, `textLength`, `patternCount` are documented via JSDoc `@typedef` and must not be treated as an arbitrary container. Downstream tooling (dataset diagnostics, telemetry, ML feature extraction) depends on these fields.

7. **All consumers refactored to use `scanPrompt()`** — the API's `analyze()` becomes a thin wrapper. Dataset scripts use adapters that map `scanPrompt()` output to their existing return shapes.

## Design Notes

### Partition lineage isolation

Seed-mutation co-location across training and validation partitions is not currently enforced. This is an intentional design choice acceptable for the current evaluation corpus. Generated records are partitioned 75/25/0 (training/validation/benchmark), guaranteeing benchmark purity. When ML experimentation is introduced, seed-lineage isolation across partitions may be added as an option.

### Engine node compatibility

`@safepaste/core` declares `engines: ">=14.0.0"` because the code uses only `var`, basic RegExp, and `String.prototype.normalize()` (ES2015). This is broader than the API's `>=18` requirement since core has zero dependencies.

## Consequences

- Positive: Single source of orchestration logic (eliminates 3 duplicate implementations)
- Positive: Any JavaScript application can now `require('@safepaste/core')` for prompt injection detection
- Positive: 92 standalone unit tests cover the complete SDK surface
- Positive: Foundation for Phase 2 (Test CLI) and Phase 3 (Guard middleware)
- Negative: API's `detector.js` now depends on core's `scanPrompt()` return shape — changes to core's output structure require API adapter updates
- Neutral: CJS-only limits ESM-native consumers to `createRequire()` workaround

## Affected Files

- `packages/core/` — new package with `index.js`, `package.json`, `test.js`, `README.md`, JSDoc in `detect.js` and `patterns.js`
- `packages/api/detector.js` — refactored to use `scanPrompt()` from core
- `scripts/dataset/evaluate.js`, `diagnose.js`, `version.js` — refactored to use core
- `scripts/build-extension.js` — path constant updated
- All documentation referencing `packages/shared/` updated to `packages/core/`
