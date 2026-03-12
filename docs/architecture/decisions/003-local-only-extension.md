# ADR-003: Local-Only Extension

**Date:** 2026-01-15
**Status:** accepted

## Context

The Chrome extension intercepts text that users paste into AI chat interfaces. This text could contain sensitive information (personal data, proprietary code, confidential documents). We needed to decide whether the extension should send this text to an external server for analysis or process it entirely locally.

## Decision

The extension performs all detection locally in the browser. Zero API calls, zero data collection, zero network requests. Detection runs entirely on the user's machine using the bundled regex patterns and scoring engine.

## Alternatives Considered

- **API-powered detection:** Extension sends pasted text to the SafePaste API for analysis — rejected because it would mean sending potentially sensitive clipboard contents to our servers. This destroys user trust and creates data handling obligations (GDPR, etc.).
- **Hybrid approach:** Local detection with optional cloud-enhanced analysis — rejected because even optional data transmission requires privacy disclosures, consent flows, and server infrastructure for a feature that may not be used.

## Consequences

- Positive: Maximum user privacy and trust. "No data collection" is a clear, verifiable claim.
- Positive: Works offline. No latency from network requests.
- Positive: Minimal Chrome permissions needed (storage, activeTab — no network permissions).
- Positive: No server costs for extension users.
- Negative: Cannot update detection patterns without publishing an extension update to Chrome Web Store.
- Negative: Cannot use ML models that are too large for browser-based inference.
- Negative: No visibility into what attacks users encounter in the wild (no telemetry).

## Affected Files

- packages/extension/ (entire package — no network code exists)
- packages/extension/manifest.json (permissions list)
