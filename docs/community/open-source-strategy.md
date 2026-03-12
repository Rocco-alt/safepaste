# Open Source Strategy

## Current Status

SafePaste is a private repository. This document captures the thinking about if, when, and how to open-source parts of the project.

## What to Open-Source First

The **detection engine** (`packages/shared/`) and the **attack taxonomy** (`docs/security/attack-taxonomy.md`) have the most community value and the least competitive risk:

- The detection engine is two files of pure JavaScript with no dependencies
- The attack taxonomy is a classification system — it becomes more valuable when more people contribute to it
- Neither reveals billing logic, deployment configuration, or API key management

## What to Keep Private

- `packages/api/billing.js` — Stripe integration and pricing logic
- `packages/api/auth.js`, `packages/api/key-manager.js` — API key management
- Deployment configuration, environment variables, infrastructure details
- Customer data and usage analytics

## Licensing Options

| License | Pros | Cons |
|---------|------|------|
| MIT | Maximum adoption, simplest | No patent protection, competitors can use freely |
| Apache 2.0 | Patent protection, widely accepted | Slightly more complex |
| AGPL | Copyleft — competitors must share changes | Limits commercial adoption |

**Recommended approach:** MIT for the detection engine/SDK (maximize adoption), with the full product under a separate license or kept private.

## Triggers for Open-Sourcing

Open-source when these conditions are met:
1. SDK is publishable (roadmap Phase 1 complete — `package.json`, exports, tests, JSDoc)
2. Dataset is large enough to be useful (50+ labeled examples across all categories)
3. Contributing documentation is ready (`docs/community/contributing.md`)
4. The project has enough momentum that community contributions are likely

## Community Building

- AI security conferences and workshops
- GitHub (discoverable by AI security researchers)
- Technical blog posts about the detection methodology
- Hacker News / relevant subreddits for launch visibility
- AI safety forums and mailing lists
