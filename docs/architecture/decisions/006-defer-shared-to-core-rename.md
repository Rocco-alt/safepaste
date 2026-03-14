# ADR-006: Defer shared-to-core Rename Until SDK Phase

**Date:** 2026-03-12
**Status:** superseded
**Superseded by:** ADR-007 (SDK Phase 1 — @safepaste/core)

## Context

SafePaste's detection engine lives in `packages/core/` — two plain JavaScript files (`detect.js` and `patterns.js`) with no `package.json`. As SafePaste evolves toward becoming developer-first AI security infrastructure, the question arose whether `packages/core/` should be renamed to `packages/core/` (as `safepaste-core`) to better reflect its role as a reusable SDK.

The rename would affect 14 files: 3 code files with `require("../shared/...")` paths, 2 generated files with path comments, the build script's hardcoded `SHARED` constant, and 9 documentation files.

## Decision

Keep the directory as `packages/core/`. Defer the rename to `packages/core/` until the SDK roadmap Phase 1 is implemented — when the directory gains a `package.json`, proper exports, JSDoc documentation, standalone tests, and is published to npm as `@safepaste/core`.

## Alternatives Considered

- **Rename now to `packages/core/`:** Would give the directory a more product-oriented name immediately — rejected because the name "core" implies a publishable package with its own identity, version, and entry point. The directory currently has none of these. Renaming now would touch 14 files for zero behavioral change and create a name that over-promises the directory's maturity.

- **Create a new `packages/core/` that wraps shared:** Would add an abstraction layer — rejected because adding indirection between two files that work well as-is adds complexity without value. The current `require("../shared/detect")` is clear and direct.

## Consequences

- Positive: No unnecessary file churn across 14 files
- Positive: The name "shared" remains semantically accurate — these are files shared between two consumers
- Positive: The rename will happen naturally as part of a larger structural change (SDK publishing) where it's justified
- Negative: The name "shared" is less product-oriented than "core" in external-facing contexts
- Neutral: Future sessions can skip this evaluation — this ADR records the deliberate decision

## Affected Files

- packages/core/ (stays as-is)
- docs/roadmap/sdk-roadmap.md (Phase 1 includes the eventual rename)

## Superseded By

This ADR will be superseded when SDK roadmap Phase 1 is implemented and the directory is renamed with full package infrastructure.
