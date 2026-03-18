# Detection Strategies

SafePaste uses three capabilities to detect attacks delivered through untrusted input. This document describes how each works, its current status, and how they interact.

## 1. Deterministic Enforcement (Operational)

The foundation of all detection. Properties: deterministic, testable, predictable, explainable, <10ms latency, zero dependencies.

### Current Implementation: Regex Pattern Matching with Weighted Scoring

**Why this approach:**
- **Fast** — under 10ms per analysis, suitable for real-time paste interception and agent pipelines
- **Transparent** — every detection includes the matched pattern ID, category, weight, and explanation
- **No external dependencies** — no ML model, no API calls, no network required
- **Deterministic** — same input always produces same output
- **Easy to extend** — add a pattern object to patterns.js, rebuild the extension

### How Scoring Works

1. **Normalize text** — NFKC Unicode normalization, remove 26 invisible/formatting characters, collapse inter-character separators (space/dot/dash/underscore for 3+ single-letter runs), collapse whitespace, lowercase
2. **Run all 61 patterns** against normalized text (benign context and OCR heuristics use raw text)
3. **Sum matched pattern weights** — each match contributes its weight (8-40)
4. **Cap at 100** — maximum possible score regardless of how many patterns match
5. **Apply benign context dampening** — if educational/demo/research context detected AND no exfiltration patterns matched AND no social engineering markers detected, multiply score by 0.85
6. **Compare against threshold:**
   - Normal mode: 35 (default)
   - Strict mode: 25 (more sensitive)
   - Red-only mode: 60 (only high-confidence attacks)
   - Off: 101 (never triggers)

### Risk Levels

- Score >= 60: **high** risk (red warning modal)
- Score >= 30: **medium** risk (yellow warning modal)
- Score < 30: **low** risk (no warning)

### False Positive Mitigation

Three layers work together:

1. **Pattern weights** — ambiguous patterns score low (follow_steps: 15, between_us: 18); unambiguous patterns score high (prompt_reference: 40, exfiltrate.hidden: 40)
2. **Benign context dampening** — educational/demo text gets 15% score reduction (0.85x multiplier). Triggered by keywords like "for example", "demonstration", "research", "documentation", or by code fences/blockquotes combined with "prompt injection" mentions. Exfiltration patterns and social engineering markers are NEVER dampened.
3. **User-configurable thresholds** — users choose sensitivity: normal (35), strict (25), red-only (60), or off

### OCR Heuristic

The `looksLikeOCR()` function detects text that appears to come from OCR, indicated by high line break ratio, unusual spacing, many pipes or bullets, or mixed scripts. This is metadata — currently informational in the API response, not used to adjust scoring.

### Known Limitations of Deterministic Enforcement

- Cannot detect semantic meaning (only syntax patterns)
- Can be evaded by sufficient rephrasing or obfuscation beyond normalization
- Binary per-pattern (either matches or doesn't — no partial match confidence)
- Weight values are manually tuned (structured learning provides data for calibration)

## 2. Structured Learning (Infrastructure Operational)

Infrastructure for capturing real-world data and feeding it into enforcement improvements through human-curated review.

### What's Built and Working

- **Telemetry collection (3-tier)** — Tier 1: in-memory aggregates (always on, ~1KB, no text). Tier 2: flagged events with content hash and pattern metadata (no text). Tier 3: full text captures (opt-in per-request, PII-sanitized, max 2000 chars). See ADR-009.
- **Feedback endpoint** — POST /v1/feedback for human detection labels (text + label + notes, sanitized, authenticated)
- **PII sanitization** — emails, phones, API keys, Bearer tokens stripped before storage. Sanitization applies to storage only, never to detector input.
- **Telemetry ingest adapter** — reads feedback captures, enforces quarantine (new data enters as `scraped`, never directly to `curated` or `benchmark`)
- **Dataset pipeline** — validate.js, evaluate.js, diagnose.js, stats.js, view.js, mutate.js, merge.js, version.js, ingest.js, analyze.js
- **Versioned dataset** — 655 records (231 curated, 424 generated, 633 scraped), partitioned into training/validation/benchmark with benchmark freeze enforcement
- **Evaluation suite** — precision/recall/FP/FN by category and partition, 7 mutation strategies, dataset poisoning diagnostics

### What's Not Automated

- **Orchestration** — `refresh.js` (weekly refresh orchestrator) is not implemented. There is no cron job or automated pipeline that runs periodically.
- **Curation** — all promotion from quarantine/scraped to curated is manual, done in development sessions by reviewing examples and deciding what to include
- **Pattern development** — new patterns are developed by humans based on analysis of false negatives, dataset exploration, and security research

### How the Learning Process Works (Today)

The improvement process is human-directed and session-based:

1. **Observe** — telemetry captures real-world scan results; feedback endpoint collects human labels
2. **Ingest** — telemetry ingest adapter moves feedback captures into the dataset pipeline as quarantined/scraped records
3. **Analyze** — evaluate.js and diagnose.js reveal false negatives, weak categories, and coverage gaps
4. **Curate** — human reviews examples, promotes useful ones to curated, removes noise/mislabeled
5. **Develop** — human writes new patterns or adjusts weights based on analysis
6. **Evaluate** — full evaluation run confirms improvement without regression (P=1.0 maintained)
7. **Ship** — updated patterns and weights ship as enforcement updates

This loop has been executed successfully across 8 improvement batches (Sessions #27-34), improving detected-category recall from ~0.75 to 0.954 while maintaining zero false positives.

## 3. Automated Intelligence (Planned)

Approaches that would accelerate structured learning and extend detection beyond regex capabilities. Each would be advisory — can elevate detection but cannot override enforcement.

### ML Classifier as Ensemble Member

- **What it addresses:** Semantic attacks, reasoning-chain manipulation, novel attack patterns with no matching regex
- **Approach:** Fine-tuned classifier (BERT/DistilBERT) trained on the curated dataset, runs alongside regex enforcement
- **Trust level:** Advisory — adds an `mlScore` to results, does not change `flagged` unless developer opts in
- **Delivery compatibility:** API and Guard (model hosting required). Not extension (too large for browser).

### LLM-Based Analysis

- **What it addresses:** Highly sophisticated attacks requiring language understanding
- **Approach:** For API-only, send high-threshold texts to an LLM for secondary analysis
- **Trust level:** Advisory — adds latency (seconds) and cost, so opt-in only
- **Delivery compatibility:** API only. Not extension, not Guard (latency incompatible with agent pipelines).

### Semantic Similarity via Embeddings

- **What it addresses:** Paraphrased attacks, novel variants of known patterns
- **Approach:** Compare input text against embeddings of known attack templates
- **Trust level:** Advisory — similarity score as additional signal
- **Delivery compatibility:** API and Guard (requires vector storage or in-memory index).

### Browser-Based ML Inference

- **What it addresses:** More sophisticated local detection without network dependency
- **Approach:** Run a small model (ONNX/TensorFlow.js) in the extension
- **Trust level:** Advisory — supplements regex, doesn't replace it
- **Delivery compatibility:** Extension only. Constrained by model size and browser resources.

### Pattern Auto-Generation

- **What it addresses:** Scaling pattern development beyond human capacity
- **Approach:** Train on attack datasets to generate candidate regex patterns for human review
- **Trust level:** Advisory — generated patterns are candidates, not automatic additions. Human review required.
- **Delivery compatibility:** Development tooling, not runtime.

## 4. How Capabilities Interact

- **Enforcement runs on every scan** — every text analyzed by the API, extension, or Guard goes through the full enforcement pipeline
- **Learning infrastructure captures data alongside enforcement** — telemetry collects aggregates and flagged events during normal scan operations (fail-open, never blocks scans)
- **Curation and evaluation happen in development sessions** — a human reviews accumulated data, develops improvements, and ships them as enforcement updates
- **Improvements ship as enforcement updates** — new patterns, weight adjustments, and normalization improvements are tested, evaluated, committed, and deployed

This is an honest description of the system: enforcement is continuous and automated; observation is continuous and automated; improvement is periodic and human-directed. There is no fully automated feedback loop running today — the infrastructure supports one, but a human turns the valve.
