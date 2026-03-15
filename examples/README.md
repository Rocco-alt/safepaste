# Examples

Runnable examples for `@safepaste/guard` agent integration.

## agent-simulation.js

Self-contained validation of guard in a simulated agent tool-call loop. No API keys or external dependencies required — uses only monorepo packages.

```bash
node examples/agent-simulation.js
```

Tests 7 scenarios: clean traffic baseline, direct injection (input), indirect injection (output), per-direction mode, callback mode, batch `wrapTools`, and a full payload coverage sweep across 13 attack categories.

This simulation validates guard integration mechanics — it is not a detection benchmark. All payloads are synthetic (independently authored in `@safepaste/test`), not sourced from dataset records.

Runs in CI. Exit code 0 = all assertions pass.

## sdk-agent-openai.js

One example of integrating guard with a real SDK provider (OpenAI). Guard is framework-agnostic — the same `wrapTool`/`wrapTools` pattern works with any provider. See the [guard README](../packages/guard/README.md) for Anthropic SDK, Vercel AI SDK, LangChain, and custom agent loop patterns.

```bash
npm install openai                 # not a project dependency
OPENAI_API_KEY=sk-... node examples/sdk-agent-openai.js
```

Demonstrates indirect injection: a search tool returns results with an embedded attack payload, and guard blocks the poisoned output before it reaches the model.
