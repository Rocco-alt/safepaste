# SafePaste Dataset Pipeline Architecture

## Context

SafePaste needs a continuously evolving prompt injection dataset system, not a static collection. This dataset will become SafePaste's core research asset — powering detection evaluation, SDK testing, pattern development, and eventually benchmarking. Current state: 5 seed examples in a single JSONL file. Target: a pipeline that supports 200-500+ curated examples, deterministic mutation-generated variants, external ingestion, versioning, dataset partitions (training/validation/benchmark), and safety-isolated evaluation.

**Critical safety rule:** Dataset text must never be interpreted as instructions by any LLM or execution environment. Only deterministic scripts process dataset text. No LLM involvement in any pipeline stage.

## Architecture Overview

```
  DATA SOURCES
  ────────────────────────────────────────────────────────────────

  PUBLIC SOURCES                    REAL-WORLD USAGE
  (GitHub, research, HuggingFace)   (API telemetry, user reports)
           |                                  |
           v                                  v
  +-------------------+             +-------------------+
  |    ingest.js      |             | (sanitize + strip |
  | (source adapters) |             |  PII + truncate)  |
  +-------------------+             +-------------------+
           |                                  |
           v                                  v
    scraped/*.jsonl                  telemetry/*.jsonl
           |                                  |
           +──── [Manual review] ─────────────+───→ curated/*.jsonl
                                                          |
                                                          v
                                                 +---------------+
                                                 |  mutate.js    | (deterministic only)
                                                 +---------------+
                                                          |
                                                          v
                                                  generated/*.jsonl

  PIPELINE
  ────────────────────────────────────────────────────────────────

  curated/ + generated/ + scraped/ (opt-in) + telemetry/ (opt-in)
           |
           v
   +---------------+
   |   merge.js    |  Deduplicate, combine, assign partitions
   +---------------+
           |
           v
   +---------------+
   |  validate.js  |  Schema + content + licensing checks
   +---------------+
           |
           v
   +---------------+
   |  evaluate.js  |  Run detection engine vs expected
   |               |  Output: precision, recall, FP/FN, coverage
   +---------------+
           |
           v
   +---------------+
   |   stats.js    |  Growth metrics, category coverage, trends
   +---------------+
           |
           v
   +---------------+
   |  version.js   |  Create immutable snapshot with partitions
   +---------------+
           |
           v
  versions/vX.Y.Z/
  ├── training.jsonl         ← used to develop detection rules
  ├── validation.jsonl       ← used for iterative testing
  ├── benchmark.jsonl        ← FROZEN evaluation (never used during pattern design)
  └── dataset_version.json   ← metadata + metrics
```

## Directory Structure

```
datasets/
├── README.md                                # Top-level overview of all datasets
├── prompt-injection/
│   ├── README.md                            # (update existing)
│   ├── format.md                            # (update existing — add new fields/categories)
│   ├── curated/                             # Hand-reviewed, high-confidence examples
│   │   ├── instruction_override.jsonl
│   │   ├── role_hijacking.jsonl
│   │   ├── system_prompt_extraction.jsonl
│   │   ├── secrecy_manipulation.jsonl
│   │   ├── data_exfiltration.jsonl
│   │   ├── jailbreak_bypass.jsonl
│   │   ├── encoding_obfuscation.jsonl
│   │   ├── instruction_chaining.jsonl
│   │   ├── meta_prompt_attacks.jsonl
│   │   ├── context_smuggling.jsonl
│   │   ├── tool_call_injection.jsonl
│   │   ├── system_message_spoofing.jsonl
│   │   ├── roleplay_jailbreak.jsonl
│   │   ├── translation_attack.jsonl
│   │   ├── multi_turn_injection.jsonl
│   │   ├── instruction_fragmentation.jsonl
│   │   └── benign.jsonl
│   ├── generated/                           # Deterministic mutation pipeline output
│   ├── scraped/                             # Raw ingestion from public sources (pre-review)
│   ├── telemetry/                           # Real-world attack collection (sanitized, PII-stripped)
│   ├── training/                            # PARTITION: used to develop detection rules
│   ├── validation/                          # PARTITION: used for iterative testing
│   ├── benchmark/                           # PARTITION: FROZEN evaluation set (never used during pattern design)
│   ├── versions/                            # Immutable versioned snapshots
│   │   └── v0.1.0/
│   │       ├── training.jsonl
│   │       ├── validation.jsonl
│   │       ├── benchmark.jsonl
│   │       └── dataset_version.json
│   └── examples/
│       └── sample-attacks.jsonl             # (keep existing — format demo)
│
├── rag-injection/
│   ├── README.md
│   ├── format.md
│   ├── curated/
│   │   ├── markdown_document_injection.jsonl
│   │   ├── html_hidden_prompt.jsonl
│   │   ├── pdf_instruction_injection.jsonl
│   │   ├── readme_repo_injection.jsonl
│   │   ├── invisible_unicode_injection.jsonl
│   │   ├── documentation_poisoning.jsonl
│   │   └── benign.jsonl
│   ├── generated/
│   ├── scraped/
│   ├── telemetry/
│   ├── training/
│   ├── validation/
│   ├── benchmark/
│   └── versions/

scripts/dataset/
├── lib/
│   ├── schema.js           # JSONL schema validation (required/optional fields, valid values)
│   ├── safety.js           # Safety isolation (escapeForDisplay, assertNotExecutable, wrapHandler)
│   ├── io.js               # JSONL read/write/append/walk utilities
│   ├── categories.js       # Category registry: 17 prompt-injection + 6 RAG categories, detected flag
│   ├── dedup.js            # SHA-256 content hashing, deduplication
│   └── partition.js         # Dataset partition logic (training/validation/benchmark split)
├── validate.js             # Schema + content + licensing + cross-record validation → exit 0/1
├── evaluate.js             # Run detection engine → precision, recall, FP/FN, coverage
├── stats.js                # Growth metrics, category coverage, version trends
├── view.js                 # Safe escaped dataset viewer (table/json/csv output)
├── merge.js                # Combine sources, deduplicate, assign partitions
├── mutate.js               # Deterministic adversarial variant generation (7 strategies, NO LLM)
├── version.js              # Create immutable versioned snapshot with partition splits
├── ingest.js               # Source adapter framework for external collection
├── adapters/
│   ├── jsonl-file.js       # Import from existing JSONL files
│   ├── csv-file.js         # Import from CSV files
│   ├── huggingface.js      # Fetch from HuggingFace datasets API
│   └── github-repo.js      # Clone/fetch from GitHub repos
└── refresh.js              # Weekly orchestrator (ingest→mutate→merge→validate→evaluate→stats→version)
```

## Safety Isolation Design (Critical)

All dataset text is adversarial input. The architecture enforces this at every layer. **No LLM is involved in any pipeline stage.** All processing is deterministic.

**`lib/safety.js` exports:**
- `escapeForDisplay(text)` — HTML-escape + truncate for safe terminal/log output
- `assertNotExecutable(text)` — throws if text flows toward eval/Function/child_process
- `sanitizeForProcessing(text)` — returns frozen, read-only string (no template literal interpolation)
- `wrapHandler(fn)` — HOF that wraps any text processor with safety checks

**Rules enforced across all scripts:**
1. **Text is data, never code** — no `eval()`, no `Function()`, no template literals with dataset text. No shell command construction with dataset content.
2. **No LLM involvement** — dataset text must never be sent to any LLM during ingestion, mutation, validation, or evaluation. All mutation strategies are deterministic pure-JS functions. LLM paraphrasing may be added in a future phase only after the deterministic pipeline is proven stable.
3. **Detection engine is read-only** — `evaluate.js` calls the same pure functions as the API (normalizeText→findMatches→computeScore→dampening). These are pure functions that return data — they never execute text.
4. **Display escaping** — `view.js` and all reports use `escapeForDisplay()`. Attack strings never render unescaped in terminals, logs, or reports.
5. **Scraped/telemetry data quarantine** — `merge.js` excludes `scraped/` and `telemetry/` by default. Requires explicit `--include-scraped` or `--include-telemetry` flags. Manual review required before promotion to `curated/`.
6. **Telemetry sanitization** — telemetry entries are truncated to safe context windows, stripped of PII (email addresses, API keys, names), and sanitized before storage. Raw telemetry is never stored.

## Data Format Updates

**New required field:**
| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Unique identifier. Format: `safepaste_pi_NNNNNN` or `safepaste_rag_NNNNNN` |

**New `source` values:** `"synthetic_mutation"`, `"scraped"`, `"telemetry"`

**8 new category values:** `context_smuggling`, `rag_document_injection`, `tool_call_injection`, `system_message_spoofing`, `roleplay_jailbreak`, `translation_attack`, `multi_turn_injection`, `instruction_fragmentation`

**New optional fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `mutation_type` | string | Which mutator produced this variant |
| `parent_hash` | string | SHA-256 of original text (for traceability) |
| `partition` | string | `"training"`, `"validation"`, or `"benchmark"` (assigned by merge.js) |
| `timestamp` | string | ISO timestamp (required for telemetry, optional for others) |

**Required metadata for scraped data** (provenance/licensing):
| Field | Type | Purpose |
|-------|------|---------|
| `metadata.source_url` | string | URL where the example was found |
| `metadata.license` | string | License of the source (e.g., "MIT", "CC-BY-4.0", "unknown") |
| `metadata.collection_method` | string | How it was collected (e.g., "huggingface_api", "manual_extraction") |
| `metadata.original_author` | string | Author/organization if known, "unknown" otherwise |

**Evaluation-only fields** (written to versioned output only, not source files):
| Field | Type | Purpose |
|-------|------|---------|
| `detected_by_engine` | boolean | Whether current engine flags this |
| `engine_score` | number | Score from current engine |
| `engine_matches` | string[] | Pattern IDs that matched |

**RAG injection format** adds: `document_type` (required: markdown/html/pdf/readme/documentation/plaintext) and `injection_location` (optional: header/body/footer/metadata/comment/hidden)

## Dataset Partitions

| Partition | Purpose | Rules |
|-----------|---------|-------|
| **training** | Develop and tune detection rules | Can be examined when writing patterns. ~60% of examples. |
| **validation** | Iterative testing during development | Used to check pattern changes. ~20% of examples. |
| **benchmark** | Frozen evaluation dataset | **NEVER examined when designing patterns.** Only used by evaluate.js to measure detection quality. ~20% of examples. |

### Stratified Partitioning (`lib/partition.js`)

Partitions are assigned **per category**, not globally. This guarantees every attack category is represented in all three partitions.

**Algorithm:**
1. Group all examples by `category`
2. Within each category, sort by `id` (deterministic ordering)
3. Assign 60/20/20 split within each category:
   - First 60% → training
   - Next 20% → validation
   - Final 20% → benchmark
4. Benign examples are also split 60/20/20

**Example:** If `instruction_override` has 30 examples:
- 18 → training, 6 → validation, 6 → benchmark

This ensures:
- Every category appears in every partition (no category gaps in benchmark)
- Distribution is balanced across partitions
- Adding new examples within a category extends existing assignments (existing entries keep their partition)
- Sort-by-id ensures deterministic, reproducible assignment

### Benchmark Freeze Policy

**Once an example enters the benchmark partition in a released dataset version, it is immutable:**
- It must never be modified in future versions
- It must never be removed in future versions
- Future versions may only APPEND new benchmark examples

**`version.js` enforces this:**
1. Before creating a new version, loads the previous version's `benchmark.jsonl`
2. Verifies every previous benchmark entry (matched by `id`) still exists unchanged
3. Fails with an error if any benchmark entry was modified or removed
4. New entries may be added to the benchmark partition

This policy ensures benchmark metrics are comparable across versions. Documented in `datasets/prompt-injection/README.md`.

`merge.js` writes separate files per partition into `training/`, `validation/`, `benchmark/` directories and into versioned snapshots.

## Example IDs

Every dataset entry has a required `id` field. Format: `safepaste_pi_NNNNNN` (prompt injection) or `safepaste_rag_NNNNNN` (RAG injection).

**Examples:**
- `safepaste_pi_000001` — first prompt injection example
- `safepaste_rag_000001` — first RAG injection example
- `safepaste_pi_000150` — 150th prompt injection example

**Auto-assignment:** `lib/io.js` provides `nextId(dataset, prefix)` that scans existing JSONL files to find the highest ID and returns the next sequential one. IDs are never reused — if an example is deleted, its ID is retired.

**Purpose:**
- Reference specific examples in evaluation reports ("false positive on safepaste_pi_000042")
- Track individual examples across versions (benchmark freeze uses ID matching)
- Debug detection issues ("what happened to safepaste_pi_000007 after pattern change?")
- Deduplication fallback (same text can have different IDs if from different sources, but dedup flags it)

## Telemetry Dataset

`telemetry/` stores real-world attacks collected from API usage (when users opt in). This becomes the most valuable data source over time.

**Telemetry entry format:**
```json
{
  "text": "...",
  "source": "telemetry",
  "timestamp": "2026-03-13T14:30:00Z",
  "category": "instruction_override",
  "detected_by_engine": true,
  "engine_score": 65,
  "notes": "Detected via POST /v1/scan"
}
```

**Sanitization rules (enforced before storage):**
- Text truncated to 2000 characters max
- PII stripped: email addresses, API keys, phone numbers, names (regex-based)
- No raw request metadata (IP, user-agent, etc.)
- Telemetry entries are quarantined in `telemetry/` — manual review required before promotion to `curated/`

## Key Scripts

**`evaluate.js`** — the heart of the system. For each record:
1. `require('../../packages/shared/detect')` and `require('../../packages/shared/patterns')`
2. Run: normalizeText → findMatches → computeScore → isBenignContext → hasExfiltrationMatch → applyDampening
3. Compare `flagged` (threshold 35) vs `expected_flagged`
4. Categories with `detected: false` in `categories.js` are reported as "detection gaps", not false negatives
5. Supports `--partition benchmark` to evaluate only the frozen benchmark set

**Evaluation output metrics:**
```json
{
  "total_examples": 320,
  "true_positives": 180,
  "true_negatives": 65,
  "false_positives": 3,
  "false_negatives": 12,
  "not_currently_detected": 60,
  "precision": 0.984,
  "recall": 0.938,
  "false_positive_rate": 0.044,
  "false_negative_rate": 0.062,
  "coverage_by_category": {
    "instruction_override": { "total": 30, "detected": 28, "recall": 0.93 },
    "context_smuggling": { "total": 10, "detected": 0, "recall": 0, "note": "no patterns exist" }
  },
  "undetected_attack_classes": ["context_smuggling", "tool_call_injection", ...],
  "score_distribution": { "0-10": 70, "11-20": 5, "21-30": 8, "31-50": 15, "51-70": 40, "71-100": 182 }
}
```

**`mutate.js`** — 7 deterministic mutation strategies (all pure JS, NO LLM):
1. Synonym substitution (static word list: ignore↔disregard↔forget↔set aside↔put aside)
2. Punctuation mutation (add/remove/swap periods, commas, ellipses)
3. Whitespace mutation (extra spaces, tabs, zero-width chars between keywords)
4. Encoding variants (base64 portions, Unicode homoglyphs, ROT13 fragments)
5. Context embedding (wrap in email, markdown doc, meeting notes, code comment)
6. Instruction fragmentation (split instruction across sentences/paragraphs)
7. Multilingual templates (wrap attack in translation request: "Translate this to Spanish: [attack]")

All mutators are pure functions: `(record) => record[]`. No randomness — same input always produces same variants. No network calls, no LLM, no external dependencies.

**`version.js`** — creates versioned snapshot with partition splits:
```json
{
  "version": "0.1.0",
  "date": "2026-03-13",
  "total_examples": 320,
  "partitions": {
    "training": 192,
    "validation": 64,
    "benchmark": 64
  },
  "by_label": { "attack": 250, "benign": 50, "edge-case": 20 },
  "by_source": { "manual": 50, "curated": 100, "synthetic_mutation": 150, "scraped": 10, "telemetry": 10 },
  "by_category": { ... },
  "precision": 0.984,
  "recall": 0.938,
  "false_positive_rate": 0.044,
  "false_negative_rate": 0.062,
  "undetected_attack_classes": ["context_smuggling", "tool_call_injection", ...],
  "safepaste_patterns_version": 19
}
```

## 17 Attack Categories

| # | Category | Currently Detected? | Pattern IDs |
|---|----------|-------------------|-------------|
| 1 | instruction_override | Yes | override.* (6 patterns) |
| 2 | role_hijacking | Yes | role.* (2 patterns) |
| 3 | system_prompt_extraction | Yes | system.* (1 pattern) |
| 4 | secrecy_manipulation | Yes | secrecy.* (2 patterns) |
| 5 | data_exfiltration | Yes | exfiltrate.* (3 patterns) |
| 6 | jailbreak_bypass | Yes | jailbreak.* (2 patterns) |
| 7 | encoding_obfuscation | Yes | encoding.* (1 pattern) |
| 8 | instruction_chaining | Yes | instruction_chain.* (1 pattern) |
| 9 | meta_prompt_attacks | Yes | prompt_injection.* (1 pattern) |
| 10 | context_smuggling | No | — |
| 11 | rag_document_injection | No | — |
| 12 | tool_call_injection | No | — |
| 13 | system_message_spoofing | No | — |
| 14 | roleplay_jailbreak | No | — |
| 15 | translation_attack | No | — |
| 16 | multi_turn_injection | No | — |
| 17 | instruction_fragmentation | No | — |

## Phased Implementation

### Phase 0: Foundation (implement first — 1-2 sessions)
Build the shared library, validation, evaluation, and partition logic.

**Create:**
1. `scripts/dataset/lib/schema.js` — JSONL validation with `id` uniqueness, licensing checks for scraped data
2. `scripts/dataset/lib/safety.js` — safety isolation utilities
3. `scripts/dataset/lib/io.js` — JSONL read/write/walk + `nextId(dataset, prefix)` for auto-ID assignment
4. `scripts/dataset/lib/categories.js` — 17 prompt-injection + 6 RAG categories
5. `scripts/dataset/lib/dedup.js` — SHA-256 content deduplication
6. `scripts/dataset/lib/partition.js` — stratified partitioning by category (60/20/20, sort by id)
7. `scripts/dataset/validate.js` — schema + content + licensing + ID uniqueness validation
8. `scripts/dataset/evaluate.js` — detection engine eval with precision/recall/coverage + `--partition` flag
9. `datasets/README.md` — top-level overview including benchmark freeze policy

**Create empty directories (with .gitkeep):**
- `datasets/prompt-injection/curated/`
- `datasets/prompt-injection/generated/`
- `datasets/prompt-injection/scraped/`
- `datasets/prompt-injection/telemetry/`
- `datasets/prompt-injection/training/`
- `datasets/prompt-injection/validation/`
- `datasets/prompt-injection/benchmark/`
- `datasets/prompt-injection/versions/`

**Modify:**
- `datasets/prompt-injection/format.md` — add new fields, categories, partition rules, licensing
- `datasets/prompt-injection/README.md` — update directory structure
- `package.json` — add `validate:dataset` and `evaluate:dataset` scripts

### Phase 1: Seed Dataset + Stats + RAG Structure (2-3 sessions)
Expand to 200-500 curated examples across all 17 categories. Create RAG dataset.

**Create:**
- 18 JSONL files in `datasets/prompt-injection/curated/`
- 7 JSONL files in `datasets/rag-injection/curated/`
- `datasets/rag-injection/README.md`, `format.md`, and empty directories
- `scripts/dataset/stats.js` — growth metrics and trends
- `scripts/dataset/view.js` — safe escaped viewer

### Phase 2: Deterministic Mutation + Versioning (2-3 sessions)
Multiply seed dataset via deterministic mutations. Create first versioned snapshot with partitions.

**Create:**
- `scripts/dataset/mutate.js` — 7 deterministic strategies (NO LLM)
- `scripts/dataset/merge.js` — combine sources + assign partitions
- `scripts/dataset/version.js` — create versioned snapshot (training/validation/benchmark splits)

### Phase 3: Ingestion Pipeline (3-4 sessions)
External source collection with adapters. Licensing metadata enforcement.

**Create:**
- `scripts/dataset/ingest.js` — source adapter framework
- `scripts/dataset/adapters/jsonl-file.js`
- `scripts/dataset/adapters/csv-file.js`
- `scripts/dataset/adapters/huggingface.js`
- `scripts/dataset/adapters/github-repo.js`

### Phase 4: Telemetry + Continuous Refresh (2 sessions)
Real-world attack collection and weekly orchestrator.

**Create:**
- Telemetry sanitization logic (PII stripping, truncation)
- `scripts/dataset/refresh.js` — weekly orchestrator

## Critical Existing Files

| File | Used By | How |
|------|---------|-----|
| `packages/shared/detect.js` | evaluate.js | Calls all 8 pure functions for analysis |
| `packages/shared/patterns.js` | evaluate.js, categories.js | Source of truth for detection capability |
| `packages/api/detector.js` | Reference | evaluate.js follows this exact `analyze()` pattern |
| `scripts/build-extension.js` | Reference | Follow its conventions for path resolution, console output |
| `datasets/prompt-injection/format.md` | schema.js | Schema validation implements this spec |

## Verification (per phase)

**Phase 0:** `node scripts/dataset/validate.js datasets/prompt-injection/examples/` validates existing 5 examples. `node scripts/dataset/evaluate.js datasets/prompt-injection/examples/` runs detection engine and outputs precision/recall metrics. `npm test` still passes (37/37). Partition logic assigns examples deterministically.

**Phase 1:** `npm run validate:dataset` passes on all 200+ examples. `npm run evaluate:dataset` reports full metrics. All 17 categories have at least 1 example. Precision >95%, recall >90% for detected categories. Undetected categories reported separately.

**Phase 2:** Mutations expand dataset 3-5x. `version.js` creates first snapshot with training/validation/benchmark splits. `evaluate.js --partition benchmark` produces metrics from frozen set only. Same input always produces same mutations (deterministic).

**Phase 3:** At least one adapter (HuggingFace or JSONL file) ingests external data into `scraped/` with full licensing metadata. Manual promotion to `curated/` works. Validation rejects scraped entries without `metadata.license`.

**Phase 4:** Telemetry entries are sanitized (PII stripped, truncated). `refresh.js` runs the full pipeline end-to-end. Dataset version increments correctly.
