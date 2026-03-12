# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafePaste is a prompt-injection detection tool with two delivery mechanisms: a Chrome extension (client-side, fully local) and a REST API (server-side). It's a monorepo with four packages under `packages/`.

## Commands

```bash
npm install              # Install root + all packages (postinstall runs install in each package)
npm start                # Start API server (packages/api/server.js) on PORT (default 3000)
npm test                 # Run API integration tests (starts server, runs ~20 tests, exits)
npm run build:extension  # Sync shared detection logic into extension package
npm run migrate          # Initialize PostgreSQL schema (packages/api/db.js)
```

Website runs separately: `node packages/website/server.js` (port 3001).

## Architecture

### Monorepo Layout

- **packages/shared/** — Single source of truth for detection logic (`detect.js`, `patterns.js`). 19 regex patterns with weighted scoring and dampening for benign contexts.
- **packages/extension/** — Chrome Manifest v3 extension. Content scripts intercept paste events on 8 AI chat sites (ChatGPT, Claude, Gemini, Copilot, Groq, Grok), analyze text locally, and show warning modals. Uses MutationObserver for shadow DOM support and post-paste fallback for sites where clipboard access fails.
- **packages/api/** — Express REST API. Endpoints: `/v1/scan`, `/v1/scan/batch`, `/v1/patterns`, `/v1/usage`, key management, Stripe billing. Auth via Bearer tokens with `sp_` prefix (user) or `sk_admin_` prefix (admin). Per-key sliding-window rate limiting in memory.
- **packages/website/** — Static Express server for landing page and API docs.

### Shared Code Sync

Detection logic flows one direction: `packages/shared/` → `packages/extension/`. The build script (`scripts/build-extension.js`) generates `detect-core.js` and `patterns.js` in the extension directory. **Do not edit these generated files directly** — edit the shared source and run `npm run build:extension`.

### Graceful Degradation

- Database is optional: without `DATABASE_URL`, API falls back to in-memory demo keys from env vars.
- Stripe is optional: billing endpoints disabled when `STRIPE_SECRET_KEY` is not set.
- Extension is fully local — no API calls, no data collection.

## Environment Variables

See `.env.example` for the full list. Key variables: `PORT`, `DATABASE_URL`, `SAFEPASTE_ADMIN_KEY`, `SAFEPASTE_DEMO_KEY`, `SAFEPASTE_PRO_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `WEBSITE_URL`.

## Adding a Detection Pattern

1. Add the pattern to `packages/shared/patterns.js` (regex + weight 25-35 + category)
2. Run `npm run build:extension`
3. Commit both the shared source files and the generated extension files

## Tech Stack

Pure vanilla JavaScript throughout — no TypeScript, no bundlers, no frontend frameworks. Node.js 18+, Express, PostgreSQL (pg), Stripe, Chrome Extensions Manifest v3.

## Session Management

This project uses a structured session workflow for continuity across development sessions.

### Slash Commands
- `/session-start` — Orient at the beginning of a session (read memory, check git, present status)
- `/session-end` — Record session work (update session log, memory, project state, commit)
- `/new-decision` — Record an architecture decision as an ADR in docs/architecture/decisions/
- `/backlog-add` — Add an item to docs/backlog.md
- `/feature-closeout` — Close out a completed feature (update backlog, status, changelog)

### Documentation (docs/)
- `docs/project-compass.md` — Strategic direction (what we're building and why)
- `docs/architecture/` — Repo map, data flow, dependency map, ADRs
- `docs/security/` — Threat model, attack taxonomy, detection strategies, evaluation methodology, research log
- `docs/product/` — Product spec, user personas, use cases, pricing model
- `docs/roadmap/` — SDK evolution roadmap (Core → Test → Guard → Cloud)
- `docs/testing/` — Testing strategy and quality metrics
- `docs/community/` — Contributing guidelines, open-source strategy, research publications
- `docs/project-state/` — Current state, implementation status, known risks, next milestones
- `docs/backlog.md` — Feature backlog with priorities
- `docs/session-log.md` — History of development sessions
- `datasets/prompt-injection/` — Prompt injection examples for evaluation and benchmarking

### Memory Files (AI session continuity, not version-controlled)
- `MEMORY.md` — Always auto-loaded, current state + pointers
- `active-work.md` — Current task stopping point (temporary, deleted when done)
- `bugs-open.md` — Open bugs only (deleted when fixed)
- `user-prefs.md` — User collaboration preferences

### Key Rules
- Decisions and security knowledge go directly to docs/ (version-controlled, permanent)
- Bugs and task context live in AI memory (temporary, deleted when resolved)
- Session log entries are 3 lines max: Built, Decided, Next
- Architecture maps updated only when architecture changes
- ADRs are never deleted — superseded ones get a status update
