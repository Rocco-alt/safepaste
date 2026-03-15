# Current State

**Version:** 1.2.0 (extension/API), 0.3.0 (@safepaste/core), 0.1.0 (@safepaste/test), 0.1.0 (@safepaste/guard)
**Last updated:** Session #14 (2026-03-15)

## What's Live

- Chrome extension v1.2.0 (39 detection patterns, 13 categories, 8 AI sites)
- REST API v1 (scan, batch scan, patterns, usage, key management, free signup)
- Landing page + API docs website
- Stripe billing for Pro tier
- @safepaste/core v0.3.0 SDK (published to npm)
- @safepaste/test v0.1.0 CLI (published to npm — attack simulation, 26 payloads, 13 categories, 88 tests)
- @safepaste/guard v0.1.0 middleware (agent runtime security — wrapTool/wrapTools, 4 modes, 101 tests)

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
- 446 total tests (194 core + 88 test + 128 guard + 37 API), all passing

## Detection Engine (Session #8 expansion)

- 39 patterns covering 13 of 17 attack categories (was 36 patterns pre-session #12)
- Session #12: 3 weight adjustments, 2 regex fixes, 3 new patterns (demonstrate_unrestricted, policy_change_claim, instructed_override)
- restrictions_lifted regex tightened to AI-specific terms (content/safety/ethical/ai prefix required)
- fictional_ai regex: article requirement removed, distance expanded to 120 chars
- normalizeText() collapses newlines + whitespace before pattern matching
- Dampening factor: 0.85 — attacks scoring 42+ survive dampening
- Exfiltration patterns (including repeat_above) never dampened
- Full eval: P=1.0, R=0.867, 0 FP (was R=0.838 pre-session #12)
- Per-category recall: multi_turn 0.50, roleplay 0.585, spoof 0.81 (was 0.40, 0.49, 0.71)

## Dataset Pipeline (Session #8 versioning)

- 111 curated prompt-injection examples across 17 attack categories + 10 benign
- 17 RAG-injection examples across 7 categories
- 424 generated mutation variants (7 strategies)
- 535 total records partitioned: 392 training / 124 validation / 19 benchmark
- All 17 categories represented in benchmark
- Pipeline scripts: validate.js, evaluate.js, diagnose.js, stats.js, view.js, mutate.js, merge.js, version.js
- Version v0.3.0 snapshot with benchmark freeze enforcement
- 3 undetected attack classes: context_smuggling, translation_attack, instruction_fragmentation

## @safepaste/guard Middleware (Session #13)

- `createGuard(options)` → guard instance with `scanInput`, `scanOutput`, `wrapTool`, `wrapTools`
- 4 modes: log, warn (default), block, callback function
- Per-direction mode: `{ input: 'warn', output: 'block' }`
- `wrapTool(name, fn)` — scans input args + output result, handles sync/async
- `wrapTools(toolMap)` — batch wrapping for all tools in an object
- Fail-open: scanning failures don't block tools, reported to `on.error`
- `GuardError` thrown in block mode (`.name === 'GuardError'`, `.guardResult`)
- `scanToolInput`/`scanToolOutput` — standalone functions, always log mode
- Framework-agnostic: works with OpenAI SDK, Vercel AI SDK, LangChain, custom agent loops
- Peer dependency on `@safepaste/core >=0.3.0`, zero runtime deps
- 128 standalone tests (including 4 safety verification sections)

## CI/CD Pipeline (Session #9)

- GitHub Actions workflow: `.github/workflows/ci.yml`
- 3 parallel jobs: Tests (Node 18), Tests (Node 22), Extension sync check
- Guard unit tests added to CI pipeline (between CLI and API steps)
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
- @safepaste/core v0.3.0 published to npm (session #11)
