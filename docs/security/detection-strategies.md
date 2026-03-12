# Detection Strategies

## Current Approach: Regex Pattern Matching with Weighted Scoring

### Why Regex

- **Fast** — under 10ms per analysis, suitable for real-time paste interception
- **Transparent** — users see exactly which patterns matched and why
- **No external dependencies** — no ML model, no API calls, no network required
- **Deterministic** — same input always produces same output
- **Easy to extend** — add a pattern object to patterns.js, rebuild the extension

### How Scoring Works

1. **Normalize text** — NFKC Unicode normalization, remove zero-width characters (U+200B-U+200D, U+FEFF), collapse whitespace, lowercase
2. **Run all 19 patterns** against normalized text
3. **Sum matched pattern weights** — each match contributes its weight (15-40)
4. **Cap at 100** — maximum possible score regardless of how many patterns match
5. **Apply benign context dampening** — if educational/demo/research context detected AND no exfiltration patterns matched, multiply score by 0.75
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
2. **Benign context dampening** — educational/demo text gets 25% score reduction. Triggered by keywords like "for example", "demonstration", "research", "documentation", or by code fences/blockquotes combined with "prompt injection" mentions. Exfiltration patterns are NEVER dampened.
3. **User-configurable thresholds** — users choose sensitivity: normal (35), strict (25), red-only (60), or off

### OCR Heuristic

The `looksLikeOCR()` function detects text that appears to come from OCR (optical character recognition), indicated by:
- High line break ratio (>2% of characters)
- Unusual spacing (multiple spaces between lowercase letters)
- Many pipes or bullets (8+)
- Mixed scripts (Latin + Cyrillic in same text)

This is metadata — currently used for informational purposes in the API response, not to adjust scoring.

### Known Weaknesses

- Cannot detect semantic meaning (only syntax patterns)
- Can be evaded by sufficient rephrasing or obfuscation beyond normalization
- Binary per-pattern (either matches or doesn't — no partial match confidence)
- No learning from user feedback (no feedback loop exists)
- Weight values are manually tuned based on judgment, not empirical optimization

## Future Strategies (To Explore)

- **ML classifier as ensemble member** — trained on attack/benign datasets, runs alongside regex. Would catch semantic patterns. See ADR-004 for why this was deferred.
- **LLM-based analysis for high-risk pastes** — for the API (not extension), use an LLM to analyze text that scores above a threshold. Adds latency and cost but catches sophisticated attacks.
- **User feedback loop** — allow users to report false positives/negatives. Use reports to tune weights and discover new patterns.
- **Pattern auto-generation** — train on attack datasets to generate candidate regex patterns for human review.
- **Semantic similarity matching** — compare pasted text against known attack templates using embeddings (requires vector storage).
- **Browser-based ML inference** — run a small model (ONNX/TensorFlow.js) in the extension for local ML detection. No network required.
