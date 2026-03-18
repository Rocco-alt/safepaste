# ADR-010: System Model — Capabilities, Design Principles, Evolution Path

**Date:** 2026-03-18
**Status:** accepted

## Context

SafePaste started as a regex-based prompt injection detection tool. Over time it has grown into a broader AI security system with multiple delivery mechanisms, a versioned dataset pipeline, and infrastructure for continuous improvement. This ADR formalizes the system model: what SafePaste is, how its capabilities relate to each other, and the design principles governing its evolution.

## Decision

### What SafePaste Is

SafePaste is a developer-first security layer for AI applications — protects against attacks delivered through untrusted input across 13 categories including instruction override, data exfiltration, tool manipulation, role hijacking, and more.

SafePaste operates at points where untrusted input meets AI systems. It detects known attack patterns deterministically and has infrastructure to improve detection from real-world observations through human-curated review.

### Three Capabilities

SafePaste has three capabilities that run concurrently, not as exclusive modes:

| Capability | What it is | Status | Trust level |
|------------|-----------|--------|-------------|
| **Deterministic enforcement** | Pattern matching with weighted scoring, text normalization, benign context dampening. Same input always produces same output. | Operational (61 patterns, 13 categories) | Trusted — predictable, testable, deterministic |
| **Structured learning** | Infrastructure for capturing data and feeding it into enforcement improvements through human-curated review. | Infrastructure operational; process is human-directed, not automated | Trusted process — human review required for all promotions |
| **Automated intelligence** | ML classifiers, semantic analysis, embedding similarity, pattern auto-generation | Future — not started | Advisory — can elevate detection but must never override enforcement decisions |

#### Deterministic Enforcement

Enforcement properties (implementation-agnostic):
- **Deterministic** — same input always produces same output
- **Testable** — behavior is fully covered by regression tests
- **Predictable** — no stochastic components, no external dependencies
- **Explainable** — every detection includes matched pattern IDs, categories, weights, and explanations

Current implementation: regex pattern matching with weighted scoring (see ADR-004). Future enforcement may include non-pattern signals — ML confidence scores, structural analysis, behavioral signals — but the properties above must hold for any enforcement mechanism.

#### Structured Learning

The *infrastructure to learn* exists and is production-quality. The *learning itself* happens through human-directed review (curate examples, develop patterns, evaluate results), not through an automated loop.

What's operational:
- Dataset pipeline: validate, evaluate, diagnose, mutate, merge, version
- Evaluation suite: precision/recall/FP/FN, partition-aware, benchmark freeze

What's not operational:
- Automated orchestration
- Automated curation
- Automated pattern generation

#### Automated Intelligence (Future)

Planned approaches:
- ML classifier as ensemble member (trained on attack/benign datasets)
- Semantic similarity via embeddings
- Pattern auto-generation from datasets

Design constraint: automated intelligence outputs are *advisory*. They can elevate detection (flag things enforcement misses) but cannot silently replace enforcement decisions. Human review is required before any intelligence output influences enforcement.

### Design Principles

1. **If it must be trusted → enforcement. If it improves coverage → intelligence.**
2. Enforcement must be predictable, testable, and resistant to prompt injection targeting the detector itself.
3. ML/LLM components can assist detection and improve recall but must not silently replace enforcement decisions.
4. Human curation is a trusted process — no auto-promotion, no pseudo-ground-truth from detector output.

## Relationship to Existing ADRs

| ADR | Relationship |
|-----|-------------|
| ADR-004 | Documents the current enforcement implementation (regex patterns); this ADR describes enforcement *properties* without prescribing mechanism |
| ADR-005 | Scoring calibration serves deterministic enforcement; may be extended for intelligence signals in the future |
| ADR-007 | `scanPrompt()` is the enforcement interface; may gain optional intelligence fields in future minor versions |

## Consequences

- Positive: Clear separation between enforcement, learning, and intelligence prevents scope confusion
- Positive: Design principles prevent ML from silently degrading enforcement predictability
- Positive: Honest about automation status — infrastructure is operational, process is manual
- Negative: More complex system model requires more documentation discipline
- Negative: Three-capability framing must be kept consistent across all docs
