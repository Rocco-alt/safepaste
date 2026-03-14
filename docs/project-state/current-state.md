# Current State

**Version:** 1.2.0 (extension/API), 0.3.0 (@safepaste/core)
**Last updated:** Session #8 (2026-03-14)

## What's Live

- Chrome extension v1.2.0 (36 detection patterns, 13 categories, 8 AI sites)
- REST API v1 (scan, batch scan, patterns, usage, key management, free signup)
- Landing page + API docs website
- Stripe billing for Pro tier
- @safepaste/core v0.3.0 SDK (ready to publish)

## What's Working

- Extension paste interception on all 8 sites (ChatGPT, Claude, Gemini, Copilot, Groq, Grok)
- Shadow DOM support for Gemini (MutationObserver)
- Post-paste fallback for Grok (detects after paste when clipboard access fails)
- Warning modals (red for high risk, yellow for medium)
- Extension popup with per-site toggle and status badge
- Extension settings page with strict mode, threshold, per-site toggles
- API auth with per-key sliding-window rate limiting
- PostgreSQL key persistence with in-memory fallback
- Free tier signup (POST /v1/signup)
- Pro tier Stripe checkout + webhook provisioning
- 36 detection patterns with weighted scoring and benign context dampening

## @safepaste/core SDK (Session #8)

- `scanPrompt(text, options)` → `{ flagged, risk, score, threshold, matches[], meta{} }`
- 8 low-level functions re-exported for advanced use
- 36 PATTERNS exported for custom pipelines
- Zero dependencies, works in Node.js >=14 and modern browsers
- 166 standalone unit tests, JSDoc on all exports
- API detector.js refactored to thin wrapper over scanPrompt()
- Dataset scripts refactored to use scanPrompt()
- 203 total tests (166 core + 37 API), all passing

## Detection Engine (Session #8 expansion)

- 36 patterns covering 13 of 17 attack categories (was 19 patterns / 9 categories)
- 4 existing patterns expanded (ignore_previous, jailbreak.dan, system.prompt_reference, encoding.obfuscated)
- 17 new patterns across 8 categories (6 FN fixes + 11 new category patterns)
- normalizeText() collapses newlines + whitespace before pattern matching
- Dampening factor: 0.85 — attacks scoring 42+ survive dampening
- Exfiltration patterns (including repeat_above) never dampened
- Benchmark: P=1.0, R=1.0 (was P=1.0, R=0.545)
- Full eval: P=0.999, R=0.838, 1 FP (benign context edge case)

## Dataset Pipeline (Session #8 versioning)

- 111 curated prompt-injection examples across 17 attack categories + 10 benign
- 17 RAG-injection examples across 7 categories
- 424 generated mutation variants (7 strategies)
- 535 total records partitioned: 392 training / 124 validation / 19 benchmark
- All 17 categories represented in benchmark
- Pipeline scripts: validate.js, evaluate.js, diagnose.js, stats.js, view.js, mutate.js, merge.js, version.js
- Version v0.3.0 snapshot with benchmark freeze enforcement
- 3 undetected attack classes: context_smuggling, translation_attack, instruction_fragmentation

## CI/CD Pipeline (Session #9)

- GitHub Actions workflow: `.github/workflows/ci.yml`
- 3 parallel jobs: Tests (Node 18), Tests (Node 22), Extension sync check
- Branch protection on main: all 3 checks required, strict mode (PRs must be up-to-date)
- Extension sync check uses `git diff -I "^// Generated:"` to ignore timestamp-only diffs
- No env vars needed — API falls back to in-memory demo keys

## What's Not Working / Incomplete

- No automated tests for the extension (only API and core have tests)
- No monitoring or alerting for the API
- In-memory rate limiting resets on server restart
- No user feedback mechanism for false positives/negatives
- Dataset ingestion adapters not yet implemented (Phase 3)
- 3 undetected attack classes (context_smuggling, translation_attack, instruction_fragmentation)
- @safepaste/core not yet published to npm
