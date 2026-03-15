# SDK Roadmap

SafePaste is evolving from a detection tool into developer-first AI security infrastructure. This roadmap outlines four phases, each building on the previous.

## Phase 1: SafePaste Core — Prompt Injection Detection SDK

**Description:** Publish the detection engine (`packages/core/`) as a standalone npm package (`@safepaste/core`) that any JavaScript application can import. This is the foundation for all future phases.

**Key Deliverables:**
- Add `package.json` with proper name, version, exports, and metadata
- Add JSDoc documentation to all 8 exported functions
- Add standalone unit tests (independent of the API test suite)
- Rename `packages/core/` to `packages/core/` (see ADR-006 for why this is deferred to this phase)
- Update build script and API imports for new path
- Publish to npm as `@safepaste/core`
- Create a simple SDK interface: `scanPrompt(text, options)` → `{ flagged, risk, score, matches }`
- Write SDK README with quickstart, API reference, and examples

**Dependencies:** None — the foundation already exists in `packages/core/detect.js` and `packages/core/patterns.js`

**Scope:** Small-medium. The code exists; the work is packaging, documentation, and publishing.

**Status:** **Complete.** Published as @safepaste/core v0.1.0. scanPrompt() SDK interface, 92 unit tests, JSDoc documentation.

---

## Phase 2: SafePaste Test — Attack Simulation CLI

**Description:** A command-line tool that generates prompt injection test cases across all taxonomy categories. Developers use it in CI/CD pipelines to test whether their AI applications are vulnerable to known attack patterns.

**Key Deliverables:**
- CLI tool: `npx safepaste-test <target-prompt>` generates adversarial variants
- Test case generation for each attack taxonomy category
- Output formats: JSON, JSONL, human-readable report
- Integration with CI/CD: exit code 0/1 based on detection results
- Uses `@safepaste/core` for detection (validates that the SDK interface works)
- Seed test cases from `datasets/prompt-injection/`

**Dependencies:** Phase 1 (uses the published SDK), attack taxonomy, prompt injection dataset

**Scope:** Medium. Requires designing the CLI interface, test generation logic, and output formatting.

**Status:** **Complete.** `@safepaste/test` v0.1.0 — CLI + programmatic API, 26 independently authored payloads across 13 detected categories, 3 injection strategies (prepend/append/wrap), 3 output formats (report/json/jsonl), 88 tests, CI/CD exit codes.

---

## Phase 3: SafePaste Guard — Agent Runtime Security

**Description:** Middleware for AI agent frameworks (LangChain, CrewAI, custom agents) that scans tool inputs and outputs in real time. Catches injection attempts that enter the agent pipeline through tool responses (web scraping, document retrieval, API calls).

**Key Deliverables:**
- Middleware/wrapper compatible with popular agent frameworks
- Scan tool-call inputs before execution
- Scan tool-call outputs before they're processed by the agent
- New detection patterns for agent-specific attack vectors (indirect prompt injection via tool use, payload-in-context, competing system messages)
- Configurable response: log, warn, block, or custom callback
- Uses `@safepaste/core` for detection

**Dependencies:** Phase 1, new detection patterns for tool-calling attacks (currently in "not yet detected" section of attack taxonomy)

**Scope:** Large. Requires research into agent attack surfaces, framework integration design, and new detection patterns.

**Status:** **Complete.** `@safepaste/guard` v0.1.0 — `createGuard()` factory with `wrapTool`/`wrapTools` function wrapping, 4 modes (log/warn/block/callback), per-direction mode config, fail-open scanning, `scanToolInput`/`scanToolOutput` standalone functions, 101 tests. Framework-agnostic (works with OpenAI SDK, Vercel AI SDK, LangChain, custom loops). Agent-specific detection patterns deferred to core.

---

## Phase 4: SafePaste Cloud — Hosted API + Analytics

**Description:** A multi-tenant hosted platform with a dashboard showing detection trends, top attack categories, false positive rates, and team management. Evolves the current single-server API into production-grade cloud infrastructure.

**Key Deliverables:**
- Analytics dashboard: detection trends, category breakdown, false positive tracking
- Team/organization management with role-based access
- Multi-tenant infrastructure with per-tenant isolation
- Redis-based rate limiting (replaces in-memory)
- Persistent audit logging (what was scanned, when, by whom)
- Webhook notifications for detected threats
- Self-service enterprise tier with custom configuration

**Dependencies:** Phases 1-3, significant infrastructure investment

**Scope:** Large. This is a full product expansion, not an incremental feature.

**Status:** Not started. The current API (packages/api/) is the foundation but is single-tenant, single-server, and has no dashboard.

---

## Phase Summary

| Phase | Product | Scope | Status | Key Dependency |
|-------|---------|-------|--------|----------------|
| 1 | SafePaste Core (SDK) | Small-medium | Foundation exists | None |
| 2 | SafePaste Test (CLI) | Medium | **Complete** | Phase 1 + dataset |
| 3 | SafePaste Guard (Agent) | Large | **Complete** | Phase 1 |
| 4 | SafePaste Cloud (Platform) | Large | Not started | Phases 1-3 |
