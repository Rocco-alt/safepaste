# Project Compass

## The Problem

Users copy-paste text from untrusted sources into AI chat interfaces without realizing the text may contain prompt injection attacks that manipulate the AI's behavior.

## What SafePaste Is

A prompt injection detection system that warns users before malicious text reaches an AI. Delivered as a Chrome extension (client-side, fully local) and a REST API (server-side).

## What SafePaste Is NOT

- Not a content filter or censor
- Not an AI firewall (doesn't sit between user and AI infrastructure)
- Not a replacement for AI model safety — it's a user-side early warning system
- Not trying to catch every possible attack — focused on common, recognizable patterns

## Design Philosophy

1. **Privacy first** — the extension never sends data anywhere. Detection is local.
2. **Transparency** — users see exactly why text was flagged (matched patterns, scores).
3. **User control** — users can override warnings, configure sensitivity, disable per-site.
4. **Simplicity** — vanilla JS, no frameworks, no build complexity.
5. **Defense in depth** — weighted scoring + dampening + configurable thresholds.

## Long-Term Architecture Direction

- Extension remains local-only (core trust proposition)
- API evolves to support enterprise integrations
- Detection evolves beyond regex toward ML-assisted analysis
- Pattern library grows through security research and community contribution
- Consider: browser-based ML inference for more sophisticated local detection

## Success Criteria

- Chrome extension installs and positive reviews
- API customers on paid tier
- Low false positive rate on real-world text
- Detection coverage across major prompt injection categories
- Research citations or industry recognition for the attack taxonomy
