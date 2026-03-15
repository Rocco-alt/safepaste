---
description: End current session, update docs, and commit
---

Wrapping up this SafePaste session. Complete ALL of these steps:

## 1. Gather Session Summary
Review this conversation and identify:
- What was accomplished (features built, bugs fixed, changes made)
- What decisions were made and why
- What bugs were discovered (fixed or not)
- What security insights were learned
- What is incomplete or in progress
- What should the next session do

## 2. Update Session Log
Add a new entry to docs/session-log.md:
```
## Session #N — YYYY-MM-DD
- **Built:** [what was accomplished, 1-2 lines]
- **Decided:** [key decisions, or "none"]
- **Next:** [what the next session should start with]
```

## 3. Update MEMORY.md
Update these sections in the memory MEMORY.md file:
- Current State: version, branch, test status
- Last session: number and one-line summary
- Active Work: what's in progress (or clear if nothing)
- Open Bugs: count
Keep MEMORY.md under 50 lines. If over, move detail to topic files.

## 4. Update Active Work
- If work is incomplete: update active-work.md with stopping point and next steps
- If work is complete: delete the content of active-work.md or note what's next

## 5. Update Bug Tracker
- New bugs discovered → add to bugs-open.md (memory) with ID, severity, impact
- Bugs fixed this session → delete from bugs-open.md

## 6. Update Project State (if significant changes happened)
- docs/project-state/current-state.md — what's live, what's working
- docs/project-state/implementation-status.md — feature status updates
- docs/project-state/known-risks.md — new risks identified

## 7. Detector Change Check
If `packages/core/patterns.js` was modified this session, perform these steps:

1. Inspect the diff of `packages/core/patterns.js` to identify:
   - New pattern IDs added
   - Modified pattern IDs (weight, regex, or category changed)
   - Removed pattern IDs

2. For each change, ensure an entry exists in `docs/security/detector-history.md` using the stable header format:
   - Added: `## YYYY-MM-DD — Pattern Added: PATTERN_ID`
   - Modified: `## YYYY-MM-DD — Pattern Modified: PATTERN_ID`
   - Removed: `## YYYY-MM-DD — Pattern Removed: PATTERN_ID`

3. **Idempotent rules** — before writing any entry:
   - Search the file for the pattern ID (e.g. `Pattern Added: exfiltrate.positional_prompt`)
   - If an entry already exists for that pattern ID and date, **do not append a duplicate**
   - If the entry exists but lacks information discovered during the session, **update it in place**
   - Only append a new entry if the pattern ID + action does not already exist in the file

4. Each entry must include:
   ```
   - **Pattern ID:** <id>
   - **Category:** <category>
   - **Weight:** <weight>
   - **Reason:** <why this pattern was added/modified/removed>
   - **Dataset Example:** <record ID if applicable>
   - **Evaluation Impact:** <metric changes, or "none">
   - **Session:** #N
   ```

5. **Safety rule:** Never delete detector history entries automatically. Pattern removals and modifications get their own entries — they do not replace previous entries.

## 8. Promote Durable Knowledge
- Architecture decisions made → create ADR via /new-decision workflow
- Security insights learned → update relevant docs/security/ file
- Security discoveries or novel attack observations → append to docs/security/research-log.md
- New backlog items identified → add to docs/backlog.md

## 9. Commit and Push
If there are uncommitted changes:
- Stage and commit with a descriptive message
- Push to origin

## 10. Confirm Handoff
Tell the user:
- What was recorded
- What the next session should start with
- Confirm the push succeeded
