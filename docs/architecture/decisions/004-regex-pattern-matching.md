# ADR-004: Regex-Based Pattern Matching for Detection

**Date:** 2026-01-15
**Status:** accepted

## Context

SafePaste needs to detect prompt injection attacks in arbitrary text. Detection approaches range from simple keyword matching to sophisticated ML classifiers. We needed an approach that is fast, transparent, and works in both Node.js and browser environments without external dependencies.

## Decision

Use regex-based pattern matching. Each detection pattern is a regular expression with metadata (ID, weight, category, explanation). Text is normalized (NFKC, zero-width char removal, whitespace collapse, lowercase) then tested against all patterns. Currently 19 patterns across 9 categories.

## Alternatives Considered

- **ML classifier (fine-tuned BERT/DistilBERT):** Would catch semantic attacks that regex misses — rejected for v1 because it requires training data, model hosting, and adds significant complexity. Planned as a future enhancement (see backlog).
- **LLM-based analysis (send to Claude/GPT):** Would provide the most sophisticated detection — rejected because it adds latency (seconds vs milliseconds), cost per analysis, and network dependency. Incompatible with the local-only extension.
- **Simple keyword matching:** Would be simpler than regex — rejected because it can't handle the contextual patterns needed (e.g., "ignore" + "previous" + "instructions" within proximity, not just "ignore" alone).

## Consequences

- Positive: Fast — under 10ms per analysis.
- Positive: Transparent — users see exactly which patterns matched and why.
- Positive: Deterministic — same input always produces same output.
- Positive: No external dependencies. Works in both Node.js and browser.
- Positive: Easy to extend — add a regex + metadata to patterns.js.
- Negative: Cannot detect semantic/reasoning-chain attacks (only syntax patterns).
- Negative: Can be evaded with sufficient rephrasing or obfuscation beyond normalization.
- Negative: Binary per-pattern (matches or doesn't — no confidence gradient within a pattern).

## Affected Files

- packages/core/patterns.js (pattern definitions)
- packages/core/detect.js (matching engine)
- packages/api/detector.js (API wrapper)
- packages/extension/detector.js (extension wrapper)
