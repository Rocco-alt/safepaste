---
description: Rebuild full repo understanding from source, then produce a structured context report
---

ultrathink

Before proposing or implementing anything, perform a repo-grounded context reconstruction of SafePaste.

Assume prior session summaries may be incomplete or lossy. Rebuild understanding from the codebase itself.

Investigate:

- detection architecture and threat model
- normalization, scoring, category handling, and dampening
- dataset pipeline, schema, mutation logic, partitioning, versioning
- evaluation semantics and benchmark integrity
- docs, comments, and recent commits for design intent

Then produce a structured report with these sections:

1. What the system actually is
2. Current architecture
3. Design intent inferred from repo evidence
4. Facts vs inferences vs uncertainties
5. Context-drift risks from prior sessions
6. Current evaluation contract
7. Design decisions to preserve
8. Design decisions that may need revision
9. Recommended next actions

Do not code yet. Do not rewrite the system unless the repo evidence justifies it. Trust the code over session memory when they conflict.
