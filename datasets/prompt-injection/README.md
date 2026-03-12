# Prompt Injection Dataset

A structured collection of prompt injection examples used for testing, evaluation, and benchmarking SafePaste's detection engine.

## Purpose

- Evaluate detection quality (detection rate, false positive rate)
- Regression testing when adding or modifying patterns
- Benchmark comparisons between detection approaches
- Training data for future ML-based detection (roadmap Phase 1+)

## Directory Structure

```
datasets/prompt-injection/
├── README.md           # This file
├── format.md           # Dataset format specification
└── examples/           # Labeled examples
    └── sample-attacks.jsonl   # Seed examples demonstrating the format
```

As the dataset grows, examples may be organized into subdirectories:
- `attacks/` — prompt injection examples by category
- `benign/` — text that should NOT trigger detection
- `edge-cases/` — ambiguous text where the correct label is debatable

## How to Use

1. See `format.md` for the JSONL format and field definitions
2. See `docs/security/evaluation-methodology.md` for the evaluation process
3. See `docs/testing/testing-strategy.md` for automated testing integration

## How to Contribute

1. Follow the format defined in `format.md`
2. Include at least `text`, `label`, `category`, `expected_flagged`, and `source`
3. Add examples to the appropriate JSONL file in `examples/`
4. See `docs/community/contributing.md` for the full contribution workflow

## Related Documentation

- `docs/security/attack-taxonomy.md` — defines the attack categories used for labeling
- `docs/security/evaluation-methodology.md` — how to measure detection quality
- `docs/security/detection-strategies.md` — how the detection engine works
