# Prompt Injection Dataset

A structured collection of prompt injection examples used for testing, evaluation, and benchmarking SafePaste's detection engine.

## Purpose

- Evaluate detection quality (precision, recall, false positive rate)
- Regression testing when adding or modifying patterns
- Benchmark comparisons between detection approaches
- Identify detection gaps across 17 attack categories

## Directory Structure

```
datasets/prompt-injection/
├── README.md           # This file
├── format.md           # Dataset format specification
├── curated/            # Hand-reviewed, high-confidence examples
├── generated/          # Deterministic mutation pipeline output
├── scraped/            # Raw ingestion from public sources (pre-review)
├── telemetry/          # Real-world attack collection (sanitized)
├── training/           # PARTITION: used to develop detection rules (~60%)
├── validation/         # PARTITION: used for iterative testing (~20%)
├── benchmark/          # PARTITION: FROZEN evaluation set (~20%)
├── versions/           # Immutable versioned snapshots
└── examples/           # Format demonstrations
    └── sample-attacks.jsonl
```

## Usage

```bash
# Validate dataset files
node scripts/dataset/validate.js datasets/prompt-injection/

# Run detection evaluation
node scripts/dataset/evaluate.js datasets/prompt-injection/

# Evaluate benchmark partition only
node scripts/dataset/evaluate.js datasets/prompt-injection/ --partition benchmark

# Get JSON output for CI integration
node scripts/dataset/evaluate.js datasets/prompt-injection/ --json
```

## 17 Attack Categories

| # | Category | Detected? |
|---|----------|-----------|
| 1 | instruction_override | Yes |
| 2 | role_hijacking | Yes |
| 3 | system_prompt_extraction | Yes |
| 4 | secrecy_manipulation | Yes |
| 5 | data_exfiltration | Yes |
| 6 | jailbreak_bypass | Yes |
| 7 | encoding_obfuscation | Yes |
| 8 | instruction_chaining | Yes |
| 9 | meta_prompt_attacks | Yes |
| 10 | context_smuggling | No |
| 11 | tool_call_injection | No |
| 12 | system_message_spoofing | No |
| 13 | roleplay_jailbreak | No |
| 14 | translation_attack | No |
| 15 | multi_turn_injection | No |
| 16 | instruction_fragmentation | No |

## Benchmark Freeze Policy

Once an example enters the benchmark partition in a released dataset version, it is **immutable**:
- It must never be modified in future versions
- It must never be removed in future versions
- Future versions may only APPEND new benchmark examples

This ensures benchmark metrics are comparable across versions.

## How to Contribute

1. Follow the format defined in `format.md`
2. Add examples to `curated/` under the appropriate category file
3. Run `node scripts/dataset/validate.js datasets/prompt-injection/curated/` to verify
4. Run `node scripts/dataset/evaluate.js datasets/prompt-injection/` to check detection
5. See `docs/community/contributing.md` for the full contribution workflow

## Related Documentation

- `docs/security/attack-taxonomy.md` — defines the attack categories
- `docs/security/evaluation-methodology.md` — how to measure detection quality
- `docs/security/detection-strategies.md` — how the detection engine works
- `datasets/README.md` — top-level dataset overview
