# Contributing to SafePaste

SafePaste is a developer-first security layer for AI applications. It uses deterministic pattern matching (61 patterns, weighted scoring) to detect prompt injection attacks across 13 categories. Contributions that improve detection quality, expand the attack taxonomy, grow the evaluation dataset, or improve documentation are especially valuable.

## Types of Contributions

### Detection Patterns (Most Valuable)

New regex patterns that catch prompt injection attacks SafePaste currently misses.

**How to add a pattern:**
1. Check `docs/security/attack-taxonomy.md` for existing categories and the "NOT YET DETECTED" section for known gaps
2. Add a pattern object to `packages/core/patterns.js`:
   ```js
   {
     id: "category.descriptive_name",
     weight: 25,  // 15-22 for ambiguous, 28-40 for strong signals
     category: "category_name",
     match: /your-regex-here/i,
     explanation: "What this pattern catches (shown to users)."
   }
   ```
3. Add test cases to the relevant `test.js` in the package you modified
4. Run `npm test` to verify no regressions
5. Test manually: 5+ texts that SHOULD match, 5+ that should NOT

### Dataset Examples

Labeled prompt injection examples for evaluation and benchmarking.

**How to submit examples:**
1. Follow the format in `datasets/prompt-injection/format.md`
2. Add entries to a JSONL file in `datasets/prompt-injection/examples/`
3. Required fields: `text`, `label`, `category`, `expected_flagged`, `source`
4. Include `difficulty` and `notes` when the example is subtle or educational

### Bug Reports

**How to report a false positive (benign text incorrectly flagged):**
- Include the exact text that was flagged
- Include the SafePaste version
- Include the risk level and score shown
- Explain why you believe the text is benign

**How to report a false negative (attack text not flagged):**
- Include the exact attack text
- Include which attack category it falls into (see `docs/security/attack-taxonomy.md`)
- Include the SafePaste version and settings (normal/strict mode)

### Documentation Improvements

Corrections, clarifications, or expansions to any file in `docs/`.

## Code Style

- **Vanilla JavaScript** — no TypeScript, no frameworks, no build tools
- **`var`** in `packages/core/` (broad compatibility)
- **`const`/`let`** in other packages
- Follow existing patterns in the codebase — read the file you're modifying before adding code
- No unnecessary dependencies — if it can be done with standard APIs, do it that way

## Review Process

SafePaste is currently maintained by a solo developer. I review PRs within a week. Pattern submissions and dataset contributions are prioritized because they directly improve detection quality.
