# ADR-005: Weighted Scoring with Dampening

**Date:** 2026-01-15
**Status:** accepted

## Context

Not all prompt injection patterns are equally suspicious. "Follow these steps" is far more ambiguous than "reveal your system prompt." We needed a scoring system that reflects this ambiguity and reduces false positives on educational or research content that legitimately discusses prompt injection.

## Decision

Each pattern has a weight (15-40). Matched weights are summed and capped at 100. Benign context detection checks for educational/demo/research framing, and if found, applies a 25% score reduction (0.75x multiplier). Exfiltration patterns are never dampened regardless of context. Users choose a threshold: normal (35), strict (25), red-only (60), or off (101).

## Alternatives Considered

- **Binary flagging:** Any pattern match = flagged — rejected because low-confidence patterns like "follow these steps" (weight 15) would cause constant false positives on legitimate text.
- **Flat scoring (all patterns equal weight):** Simpler but doesn't distinguish between high-confidence and low-confidence signals — rejected because "prompt injection" (meta reference, often benign) should not score the same as "reveal your hidden prompt" (almost always an attack).
- **No dampening:** Always use raw scores — rejected because security educators and researchers would see constant warnings when working with legitimate prompt injection examples.

## Consequences

- Positive: Ambiguous patterns contribute less to the total score, reducing false positives.
- Positive: Educational content gets reduced scoring, making the tool usable for security researchers.
- Positive: Exfiltration is never dampened — the most dangerous attack type is always flagged.
- Positive: User-configurable thresholds let users choose their sensitivity preference.
- Negative: Weight tuning is subjective — requires human judgment about how suspicious each pattern is.
- Negative: Dampening is a blunt instrument (25% for all benign contexts, not context-specific).
- Negative: Score cap at 100 means very dense attack text doesn't score higher than moderately dense text.

## Affected Files

- packages/shared/patterns.js (weight values on each pattern)
- packages/shared/detect.js (computeScore, isBenignContext, applyDampening functions)
