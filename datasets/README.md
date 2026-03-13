# SafePaste Datasets

Curated datasets for evaluating and benchmarking prompt injection detection.

## Datasets

### prompt-injection/
Prompt injection attacks targeting LLM chat interfaces. 17 attack categories covering instruction override, role hijacking, jailbreak bypass, encoding obfuscation, and more.

### rag-injection/ (planned)
RAG-specific injection attacks targeting document retrieval pipelines. 6 attack categories covering markdown injection, HTML hidden prompts, PDF injection, and more.

## Pipeline

The dataset pipeline (`scripts/dataset/`) provides:

- **validate.js** — Schema and content validation
- **evaluate.js** — Run detection engine, compute precision/recall/coverage

Future phases add: mutation, merging, versioning, ingestion, and telemetry.

## Directory Convention

Each dataset follows this structure:
```
<dataset>/
├── curated/        Hand-reviewed, high-confidence examples
├── generated/      Deterministic mutation pipeline output
├── scraped/        Raw ingestion from public sources (pre-review)
├── telemetry/      Real-world attack collection (sanitized)
├── training/       PARTITION: used to develop detection rules (~60%)
├── validation/     PARTITION: used for iterative testing (~20%)
├── benchmark/      PARTITION: FROZEN evaluation set (~20%)
├── versions/       Immutable versioned snapshots
└── examples/       Format demonstrations
```

## Benchmark Freeze Policy

Once an example enters the benchmark partition in a released dataset version, it is **immutable**:
- It must never be modified in future versions
- It must never be removed in future versions
- Future versions may only APPEND new benchmark examples

This ensures benchmark metrics are comparable across versions.

## Safety

All dataset text is adversarial input. The pipeline enforces strict safety isolation:
- Text is data, never code — no `eval()`, no `Function()`, no template literals with dataset text
- No LLM involvement — all processing is deterministic
- Display escaping — attack strings never render unescaped
- Scraped/telemetry data is quarantined until manually reviewed

## Commands

```bash
node scripts/dataset/validate.js datasets/prompt-injection/    # Validate all files
node scripts/dataset/evaluate.js datasets/prompt-injection/    # Run detection evaluation
```
