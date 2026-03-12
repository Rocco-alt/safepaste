---
description: Record a new architecture decision as an ADR
---

Record a new architecture decision for SafePaste.

1. Read docs/architecture/decisions/index.md to find the next ADR number.

2. Ask the user (or determine from conversation context):
   - What was the context? (What problem needed a decision?)
   - What was decided?
   - What alternatives were considered?
   - What are the consequences?
   - What files are affected?

3. Create a new file: docs/architecture/decisions/NNN-slug-title.md

4. Use this template:
```
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Status:** accepted

## Context
[Why this decision was needed]

## Decision
[What was decided]

## Alternatives Considered
- **[Alternative]:** [description] — rejected because [reason]

## Consequences
- Positive: [benefits]
- Negative: [trade-offs]

## Affected Files
- [files/packages impacted]
```

5. Add the new ADR to docs/architecture/decisions/index.md.

6. If this decision supersedes a previous ADR, update the old one's status to
   "superseded by ADR-NNN".
