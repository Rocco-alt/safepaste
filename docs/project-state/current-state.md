# Current State

**Version:** 1.2.0
**Last updated:** Session #3 (2026-03-13)

## What's Live

- Chrome extension v1.2.0 (19 detection patterns, 9 categories, 8 AI sites)
- REST API v1 (scan, batch scan, patterns, usage, key management, free signup)
- Landing page + API docs website
- Stripe billing for Pro tier

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

## Dataset Pipeline

- 69 curated prompt-injection examples across 17 attack categories + 10 benign
- 17 RAG-injection examples across 7 categories
- Pipeline scripts: validate.js, evaluate.js, diagnose.js, stats.js, view.js
- Shared library: schema.js, safety.js, io.js, categories.js, dedup.js, partition.js
- Evaluation: P=1.0, R=1.0, 0 FP, 0 FN on curated set
- 19/19 patterns triggered; 7 undetected attack classes identified as detection gaps

## What's Not Working / Incomplete

- No automated tests for the extension (only API has tests)
- No CI/CD pipeline
- No monitoring or alerting for the API
- In-memory rate limiting resets on server restart
- No user feedback mechanism for false positives/negatives
- Dataset mutation pipeline not yet implemented (Phase 2)
