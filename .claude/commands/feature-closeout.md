---
description: Close out a completed feature and update tracking docs
---

Close out a completed feature or milestone in SafePaste.

1. Read docs/backlog.md and identify the completed item.

2. Perform these updates:
   - Move the item from its priority section to the "## Completed" section in docs/backlog.md
     with the completion date
   - Update docs/project-state/implementation-status.md to reflect the new feature status
   - Update docs/project-state/current-state.md if the feature changes what's live
   - Add a CHANGELOG.txt entry if this is a user-facing change
   - Update version number if this is a release milestone

3. If the feature involved architecture decisions, verify the relevant ADRs are up to date.

4. If the feature changes the data flow or repo structure, update the relevant architecture
   maps in docs/architecture/.

5. If this feature completes a roadmap milestone, update the status in
   docs/roadmap/sdk-roadmap.md.

6. Summarize what was updated.
