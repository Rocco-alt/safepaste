# Current State

**Version:** 1.2.0
**Last updated:** Session #6 (2026-03-14)

## What's Live

- Chrome extension v1.2.0 (19 detection patterns, 9 categories, 8 AI sites)
- REST API v1 (scan, batch scan, patterns, usage, key management, free signup)
- Landing page + API docs website
- Stripe billing for Pro tier
- @safepaste/core v0.1.0 SDK (ready to publish)

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
- 19 detection patterns with weighted scoring and benign context dampening

## @safepaste/core SDK (Session #6)

- `scanPrompt(text, options)` → `{ flagged, risk, score, threshold, matches[], meta{} }`
- 8 low-level functions re-exported for advanced use
- 19 PATTERNS exported for custom pipelines
- Zero dependencies, works in Node.js >=14 and modern browsers
- 92 standalone unit tests, JSDoc on all exports
- API detector.js refactored to thin wrapper over scanPrompt()
- Dataset scripts refactored to use scanPrompt()
- 129 total tests (92 core + 37 API), all passing

## Detection Engine (Session #5 hardening)

- 19 patterns with synonym-expanded regexes covering SYNONYM_MAP entries from mutations.js
- normalizeText() collapses newlines + whitespace before pattern matching (fixed disconnect)
- Dampening factor: 0.85 (was 0.75) — attacks scoring 42+ survive dampening
- encoding.obfuscated weight: 35 (was 22) — standalone encoding references now flag
- Newline evasion fixed: `system\nprompt`, `developer\nmode`, etc. now detect correctly

## Dataset Pipeline

- 69 curated prompt-injection examples across 17 attack categories + 10 benign
- 17 RAG-injection examples across 7 categories
- 247 generated mutation variants (7 strategies: synonym, punctuation, whitespace, encoding, context_embedding, fragmentation, multilingual)
- 316 total records partitioned: 237 training / 74 validation / 5 benchmark
- Pipeline scripts: validate.js, evaluate.js, diagnose.js, stats.js, view.js, mutate.js, merge.js, version.js
- Shared library: schema.js, safety.js, io.js, categories.js, dedup.js, partition.js, mutations.js
- v0.2.0 evaluation: Benchmark P=1.0 R=1.0 | Validation P=1.0 R=1.0 | Training P=1.0 R=1.0 (6 mutation divergence, 0 genuine FP)
- Evaluator distinguishes mutation_label_divergence from genuine false positives
- Version v0.2.0 snapshot with benchmark freeze enforcement (v0.1.0 pinned)
- 19/19 patterns triggered; 7 undetected attack classes identified as detection gaps

## What's Not Working / Incomplete

- No automated tests for the extension (only API and core have tests)
- No CI/CD pipeline
- No monitoring or alerting for the API
- In-memory rate limiting resets on server restart
- No user feedback mechanism for false positives/negatives
- Dataset ingestion adapters not yet implemented (Phase 3)
- 7 undetected attack classes (context_smuggling, tool_call_injection, system_message_spoofing, roleplay_jailbreak, translation_attack, multi_turn_injection, instruction_fragmentation)
- Benchmark has only 5 records — needs growth before v0.3.0
- @safepaste/core not yet published to npm
