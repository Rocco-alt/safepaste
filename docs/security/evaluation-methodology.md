# Evaluation Methodology

## How to Evaluate Detection Quality

### Test Categories

1. **True positives** — known attacks that SHOULD be flagged
2. **True negatives** — benign text that should NOT be flagged
3. **False positives** — benign text incorrectly flagged (hurts user trust)
4. **False negatives** — attacks that slip through undetected (hurts security)

### Metrics

- **Detection rate (recall):** % of known attacks correctly flagged
- **False positive rate:** % of benign texts incorrectly flagged
- **Coverage:** % of attack taxonomy categories with at least one detection pattern
- **Latency:** time to analyze a single text (target: <10ms)

### Current Coverage

9 of 9 detected categories have at least one pattern. See docs/security/attack-taxonomy.md for the full list of categories NOT yet detected.

## Evaluation Process for New Patterns

Before adding a pattern to `packages/core/patterns.js`:

1. Write 5+ test cases of text the pattern SHOULD match
2. Write 5+ test cases of text the pattern should NOT match
3. Run both through the detection engine
4. Check: does the pattern cause false positives on common benign text? (code snippets, documentation, emails, casual conversation)
5. Check: what weight feels right? Lower weights (15-22) for ambiguous signals, higher weights (28-40) for strong attack indicators
6. Add test cases to `packages/api/test.js`
7. Run `npm test` to verify no regressions

## Regression Testing

When modifying detection logic (patterns.js or detect.js):

1. Run `npm test` — existing API integration tests (~20 tests)
2. Manually test 3-5 known attacks against the extension
3. Manually test 3-5 benign texts (code snippets, documentation, emails)
4. Verify dampening still works: test educational content that mentions prompt injection
5. Verify exfiltration is never dampened: test markdown image + educational framing

## Test Dataset

Labeled examples are collected in `datasets/prompt-injection/` at the repo root.

- **Format:** JSONL (one JSON object per line). See `datasets/prompt-injection/format.md` for field definitions.
- **Seed examples:** `datasets/prompt-injection/examples/sample-attacks.jsonl` contains initial examples across categories.
- **Organization:** Examples are labeled as `attack`, `benign`, or `edge-case` with taxonomy categories.

As the dataset grows, it will be organized into subdirectories:
- **attacks/** — prompt injection examples by category
- **benign/** — text that should NOT trigger detection (code, docs, emails, academic papers)
- **edge-cases/** — ambiguous text where the correct label is debatable (security tutorials, CTF writeups)

## Weight Calibration

Pattern weights are currently set by judgment. A more rigorous approach would:

1. Assemble a labeled dataset (attack/benign with categories)
2. For each pattern, measure precision (% of matches that are actual attacks)
3. Set weight proportional to precision — high-precision patterns get high weights
4. Validate against the full dataset after adjustment
5. Re-run periodically as the dataset grows

## Automated Intelligence Evaluation (Future)

When automated intelligence capabilities (ML classifiers, semantic analysis, embeddings) are added, they will be evaluated separately from enforcement:

**Key principle:** Enforcement metrics remain the primary quality gate. Enforcement must never regress when intelligence is added.

**Evaluation approach:**
- Intelligence outputs are evaluated on their own metrics (ML accuracy, embedding recall, etc.)
- Combined system evaluation measures whether intelligence improves overall detection without increasing false positives
- Enforcement-only metrics (current patterns, current scoring) are always reported alongside combined metrics
- If intelligence degrades enforcement behavior (e.g., by influencing scoring in a way that increases FP), the integration is rejected

**Benchmark isolation:** Intelligence training data must never include benchmark partition records. The benchmark freeze (v0.6.0+) applies to all capabilities, not just enforcement.
