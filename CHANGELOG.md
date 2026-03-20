# Changelog

## safepaste (Python) 0.3.0

- Published `safepaste` to PyPI — Python detection engine.
- Same 61 patterns, identical scoring, cross-language parity verified against all 655 dataset records.
- `scan_prompt()` with `ScanResult` dataclass return type.
- Strict mode support (`strict_mode=True`).
- Zero runtime dependencies, Python 3.9+.
- 404 unit tests.

## @safepaste/guard 0.1.0

- Published `@safepaste/guard` to npm — agent runtime security middleware.
- `createGuard()` factory with 4 modes: log, warn (default), block, callback.
- `wrapTool(name, fn)` / `wrapTools(toolMap)` — scans tool inputs and outputs for prompt injection.
- Per-direction mode: `{ input: 'warn', output: 'block' }` for stricter output scanning.
- Fail-open scanning: scan failures don't block tools; GuardError always propagates.
- Framework-agnostic: works with OpenAI SDK, Vercel AI SDK, LangChain, custom agent loops.
- 128 unit tests, zero runtime dependencies, peer dependency on `@safepaste/core >=0.3.0`.
- Agent simulation validation: `examples/agent-simulation.js` (35 assertions, 7 scenarios).

## @safepaste/core 0.3.0

- 61 detection patterns across 13 attack categories.
- Weighted scoring with benign context dampening.
- Zero runtime dependencies.
- 462 unit tests.

## @safepaste/test 0.1.0

- Attack simulation CLI for CI/CD gating.
- 78 adversarial variants across 13 categories.
- Three output formats: report, JSON, JSONL.
- 88 unit tests.
