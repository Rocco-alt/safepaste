---
description: Begin a new SafePaste development session and load context
---

Beginning a new SafePaste development session. Complete these steps:

1. MEMORY.md is auto-loaded. Read it for current state and active work context.

2. Run `git status` and `git log --oneline -5` to check:
   - Are there uncommitted changes from a previous session?
   - What were the most recent commits?
   - Is the working tree clean?

3. If active-work.md exists in memory, read it for task continuity details.

4. If bugs-open.md exists in memory, read it for open issues.

5. Read docs/project-state/current-state.md for the project status snapshot.

6. Present a brief orientation to the user:
   - **Last session:** [summary from MEMORY.md]
   - **Git state:** [clean/dirty, uncommitted changes if any]
   - **Active work:** [current task, or "none"]
   - **Open bugs:** [count and brief list, or "none"]
   - **Next planned:** [from MEMORY.md or next-milestones.md]

7. Ask the user what they want to work on this session.
   Do NOT start coding until the user confirms direction.
