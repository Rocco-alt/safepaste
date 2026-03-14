# Testing Strategy

## Current State

- **API:** 37 integration tests in `packages/api/test.js`. Run via `npm test`. Tests cover all endpoints, auth, rate limiting, detection responses, batch scanning, input validation, and performance (<10ms latency).
- **Extension:** Zero automated tests. All validation is manual.
- **Detection engine:** 166 standalone unit tests in `packages/core/test.js`. Run via `node packages/core/test.js`.
- **CI/CD:** GitHub Actions (3 jobs: Tests Node 18, Tests Node 22, Extension sync check). Runs on push and PR to main.

## API Testing

### What Exists
The test suite (`packages/api/test.js`) starts a test server on a random port and runs ~37 tests covering:
- Health check endpoint
- Authentication (missing key, invalid key)
- Clean text (not flagged, score 0)
- Known attacks (instruction override, exfiltration, role hijacking, jailbreak)
- Benign context dampening (score reduction for educational content)
- Strict mode (lower threshold)
- Batch scanning (mixed clean/flagged items)
- Pattern listing
- Input validation (empty text, missing text field)
- Performance (latency <10ms)

### How to Run
```bash
npm test
```

### What's Missing
- Unit tests for individual modules (auth.js, billing.js, key-manager.js)
- Load testing / stress testing
- Database integration tests (tests currently use in-memory fallback)
- Stripe webhook tests (requires mock Stripe events)

## Extension Testing Strategy

### Recommended Approach: Jest + jsdom (Phase 1)

Start with unit tests for the detection pipeline since it uses the same pure functions as the API:

1. **detector.js** — test `spAnalyze()` with various inputs, settings configurations, threshold modes
2. **settings.js** — test settings load/save logic (mock `chrome.storage`)
3. **popup.js** — test host detection and status display logic

This approach works because the detection engine is pure JavaScript with no browser-specific dependencies (the shared functions use no DOM APIs).

### Future: End-to-End Testing (Phase 2)

For testing actual paste interception on real sites:
- Puppeteer or Playwright with Chrome extension loading
- Test paste events on supported sites (requires network access or mocked pages)
- Verify modal appears, buttons work, paste is blocked/allowed correctly

Cross-reference: Milestone 1 in `docs/project-state/next-milestones.md`

## Detection Quality Testing

### Using the Dataset

The `datasets/prompt-injection/` directory contains labeled examples. To evaluate detection quality:

1. Load examples from JSONL files
2. Run each through the detection engine (`analyze()` or `scanPrompt()`)
3. Compare results against expected labels
4. Calculate metrics (see below)

Cross-reference: `docs/security/evaluation-methodology.md` for detailed process, `datasets/prompt-injection/format.md` for file format.

### Key Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Detection rate (recall) | % of attack examples correctly flagged | >90% for known categories |
| False positive rate | % of benign examples incorrectly flagged | <5% |
| Coverage | % of taxonomy categories with at least one pattern | 100% of detected categories |
| Latency | Time to analyze a single text | <10ms |
| Test count | Number of automated tests | Growing over time |

## Regression Testing Checklist

When modifying detection logic (`packages/core/patterns.js` or `packages/core/detect.js`):

1. Run `npm test` — all API tests must pass
2. Run `npm run build:extension` — regenerate extension files
3. Verify generated files match shared source (no stale copies)
4. Test 3-5 known attacks manually against the extension
5. Test 3-5 benign texts manually (code, docs, emails)
6. Verify dampening: educational content mentioning "prompt injection" should score lower
7. Verify exfiltration exception: markdown image + educational framing should still flag
8. If dataset examples exist, run them through and check for regressions

## CI/CD Target State

A GitHub Actions workflow should:

```
on: [push, pull_request]

jobs:
  test:
    - npm install
    - npm test                          # API integration tests
    - npm run build:extension           # Rebuild generated files
    - git diff --exit-code packages/extension/detect-core.js packages/extension/patterns.js
      # Fail if generated files are out of sync with shared/
    # Future: extension unit tests
    # Future: dataset evaluation run
```

Cross-reference: Milestone 2 in `docs/project-state/next-milestones.md`
