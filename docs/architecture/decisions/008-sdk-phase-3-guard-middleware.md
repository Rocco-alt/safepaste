# ADR-008: SDK Phase 3 — Guard Middleware Design

**Status:** Accepted
**Date:** 2026-03-15
**Context:** SDK Phase 3 (see sdk-roadmap.md)

## Decision

Implement `@safepaste/guard` as a framework-agnostic function wrapper, not framework-specific plugins.

## Key Design Choices

### 1. Function wrapping over framework plugins

`wrapTool(name, fn)` returns a drop-in replacement function that scans inputs and outputs. This works identically with OpenAI SDK, Vercel AI SDK, LangChain, and custom loops — zero framework coupling. Framework-specific adapters deferred to v0.2.0+.

### 2. Guard wraps core, does not modify core

No new patterns, no scoring changes. Guard is a consumption layer. Pattern improvements are separate work in `packages/core/patterns.js`. Same peer-dependency pattern as `@safepaste/test`.

### 3. Four modes: log, warn, block, callback

Default is `warn` (conservative — matches "we warn, not block" philosophy). Users opt into blocking explicitly. Callback mode enables custom decision logic.

### 4. Per-direction mode configuration

`mode` accepts `{ input: 'warn', output: 'block' }` for separate input/output policies. Tool outputs from external sources are the primary indirect injection vector, so operators commonly want stricter output policy.

### 5. Fail-open on scanning errors

If guard's own infrastructure fails, the tool executes anyway. Only intentional GuardErrors (from block mode) stop execution. Guard must never crash the host application. Errors reported to `on.error` callback.

### 6. CommonJS, vanilla JS, zero runtime deps

Consistent with core and test. `var` declarations for Node >=14 compat.

## Alternatives Considered

- **Framework-specific plugins first** — rejected; too many frameworks, fragile coupling, high maintenance
- **Async scanPrompt variant in core** — rejected; scanPrompt is <10ms sync, no benefit. Guard handles async tool functions transparently
- **ESM dual exports** — deferred to v0.2.0+; current agent ecosystem accepts CommonJS
- **Streaming tool output support** — deferred; tool outputs scanned as complete values

## Consequences

- Guard is usable from day one with any JavaScript agent framework
- No framework lock-in or version coupling
- Users must call `wrapTool` explicitly (no automatic instrumentation)
- Object args go through JSON.stringify, which may reduce detection fidelity on deeply nested structured data
