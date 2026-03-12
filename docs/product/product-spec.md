# Product Spec

## Mission

SafePaste detects prompt injection attacks before they reach AI models. It warns users when pasted text may manipulate AI behavior, acting as an early warning system for the growing threat of adversarial prompts.

## One-Line Description

Prompt injection detection delivered as a Chrome extension (local, private) and a REST API (server-side, for developers).

## Delivery Mechanisms

### Chrome Extension

A Manifest v3 extension that intercepts paste events on 8 AI chat sites (ChatGPT, Claude, Gemini, Copilot, Groq, Grok). All detection runs locally in the browser — zero API calls, zero data collection, zero network requests. When a paste looks suspicious, a warning modal appears showing which patterns matched, the risk score, and why the text was flagged. The user always has the final say: cancel the paste or allow it.

**Value proposition:** Privacy-preserving protection that requires zero configuration. Install it and forget it — it watches your clipboard when you paste into AI chats.

### REST API

An Express-based API that accepts text and returns structured detection results (flagged/not, risk level, score, matched patterns, categories). Authenticated via Bearer tokens with per-key rate limiting. Supports single scan, batch scan (up to 20 texts), pattern listing, and usage stats. Optional PostgreSQL persistence and Stripe billing for Pro tier.

**Value proposition:** Add prompt injection detection to any application with a single API call. Transparent results (matched patterns + scores) that developers can build logic on top of.

## Current Feature Set

### For End Users (Extension)
- Paste interception on 8 AI chat platforms
- Real-time detection with 19 regex patterns across 9 attack categories
- Warning modals with risk visualization (red = high, yellow = medium)
- Per-site enable/disable toggles
- Configurable sensitivity: normal, strict, red-only, or off
- Shadow DOM support for modern web apps
- Post-paste fallback for sites that restrict clipboard access
- Quick-toggle popup with status badge

### For Developers (API)
- POST /v1/scan — single text analysis with detailed results
- POST /v1/scan/batch — analyze up to 20 texts in one request
- GET /v1/patterns — list all detection patterns with weights and explanations
- GET /v1/usage — rate limit and usage stats for authenticated key
- Free and Pro tier signups with Stripe billing
- Sub-10ms detection latency

## What SafePaste Is NOT

- **Not a content filter or censor** — it warns, it doesn't block. Users always choose.
- **Not an AI firewall** — it doesn't sit between user and AI infrastructure. It's a client-side early warning system.
- **Not a replacement for AI model safety** — model providers are responsible for their own defenses. SafePaste protects the user's side.
- **Not trying to catch every attack** — focused on common, recognizable patterns. Transparent about what it can and cannot detect.
- **Not a WAF or API gateway** — it's a detection library, not a network appliance.

## Competitive Landscape

| Tool | Approach | Delivery | Open Source |
|------|----------|----------|-------------|
| SafePaste | Regex patterns + weighted scoring | Extension + API | Not yet (planned) |
| Rebuff | LLM-based detection | API | Yes |
| Lakera Guard | ML classifier | API | No |
| Prompt Guard (Meta) | Fine-tuned model | Model weights | Yes |
| Various research tools | Academic prototypes | Papers/repos | Varies |

## Differentiators

1. **Local-only extension** — the only prompt injection detector that runs entirely in the browser with zero data transmission. No other tool offers this privacy guarantee.
2. **Transparent detection** — users see exactly which patterns matched and why. Not a black-box ML score.
3. **Dual delivery** — same detection engine powers both a consumer extension and a developer API.
4. **Benign context awareness** — dampening for educational/research content reduces false positives on legitimate security discussions.
5. **Open detection logic** — the pattern library and scoring algorithm are documented and (eventually) open-source, allowing community review and contribution.
