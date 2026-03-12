# SafePaste Owner's Guide

This is a complete walkthrough of the documentation and session management system. It explains where every file is, what it does, how Claude Code uses it, how you use it, and how it works for team collaboration.

---

## The Big Picture

You're building SafePaste across hundreds of development sessions. The problem with that many sessions is continuity — every time you start a new Claude Code conversation, it starts with a blank slate. It doesn't remember what you did last time, what's broken, or what to work on next.

This system solves that with three layers:

```
LAYER 1 — ALWAYS LOADED (Claude reads these automatically)
  CLAUDE.md          → "Here's what this project is and how to work on it"
  MEMORY.md          → "Here's where we left off last time"

LAYER 2 — ON-DEMAND AI MEMORY (Claude reads when needed)
  active-work.md     → "Here's the specific task in progress"
  bugs-open.md       → "Here are the bugs to watch out for"
  user-prefs.md      → "Here's how the user likes to work"

LAYER 3 — PROJECT DOCS (permanent, in git, for humans and Claude)
  docs/              → Everything about the project: architecture, security,
                       product, roadmap, testing, community, project state
  datasets/          → Prompt injection examples for testing
```

**The key insight:** Layer 1 and 2 are for Claude's memory between sessions. Layer 3 is permanent project knowledge that lives in git, survives machine changes, and is useful to any developer (human or AI) who works on the project.

---

## Where Every File Is

### Your Machine Only (NOT in git)

These files live in your Claude Code configuration directory. They are private to you and are not committed to git. If you switch machines, you'd need to recreate them (but they're small and quick to regenerate).

```
C:\Users\raj\.claude\projects\C--Users-raj-Dev-SafePaste\memory\
├── MEMORY.md          → Auto-loaded every session. Current state + pointers.
├── active-work.md     → What task is in progress right now (temporary).
├── bugs-open.md       → Open bugs only (deleted when fixed).
└── user-prefs.md      → How you like to work with Claude.
```

**How Claude uses these:**
- `MEMORY.md` is loaded at the START of every conversation automatically. Claude reads it to know the project version, what happened last session, and what's in progress.
- The other three are read when relevant — if Claude is about to start work, it checks `active-work.md` to see if there's an unfinished task.

**How you use these:**
- You don't edit them directly. The `/session-end` command updates them automatically.
- If you want Claude to remember something specific about how you like to work, just tell it ("I prefer short explanations" or "always run tests before committing") and it will update `user-prefs.md`.

### In the Repo (committed to git, shared with everyone)

#### Slash Commands

```
SafePaste/.claude/commands/
├── session-start.md       → /session-start
├── session-end.md         → /session-end
├── new-decision.md        → /new-decision
├── backlog-add.md         → /backlog-add
└── feature-closeout.md    → /feature-closeout
```

**How Claude uses these:** When you type `/session-start` in Claude Code, it reads `session-start.md` and follows the instructions inside. The file tells Claude step-by-step what to do (check git, read memory, present a summary, ask what to work on).

**How you use these:** Just type the slash command. That's it. You don't need to read the files — they're instructions FOR Claude, not for you. But you can read them if you're curious about what they do.

**Team benefit:** Because these are in the repo, any developer who clones the project and uses Claude Code gets the same commands. They type `/session-start` and get the same orientation workflow.

#### CLAUDE.md (repo root)

```
SafePaste/CLAUDE.md
```

**How Claude uses it:** This is auto-loaded at the start of every conversation (same as MEMORY.md, but this one is in the repo). It tells Claude:
- What the project is
- How to run commands (`npm test`, `npm start`, etc.)
- The architecture (4 packages, how shared code sync works)
- Where documentation lives
- Session management rules

**How you use it:** You don't need to read it regularly. It's the "briefing document" that gets Claude up to speed. If you need to add a project-wide rule (like "never use TypeScript" or "always run tests before committing"), this is where it goes.

**Team benefit:** Any new developer (or AI tool) that opens this repo reads CLAUDE.md first and immediately knows how the project works.

#### Documentation (docs/)

```
SafePaste/docs/
├── README.md                              → Guide to the docs structure itself
├── project-compass.md                     → WHY we're building this, strategic direction
├── backlog.md                             → Feature wishlist with priorities
├── session-log.md                         → History of every dev session
│
├── architecture/                          → HOW the code is structured
│   ├── repo-map.md                        → Package layout, entry points, DB schema
│   ├── data-flow.md                       → How data moves through the system
│   ├── dependency-map.md                  → What depends on what
│   └── decisions/                         → WHY we made specific choices
│       ├── index.md                       → Table of all decisions
│       ├── 001-monorepo-structure.md      → Why monorepo with shared/
│       ├── 002-vanilla-javascript.md      → Why no TypeScript or frameworks
│       ├── 003-local-only-extension.md    → Why extension doesn't phone home
│       ├── 004-regex-pattern-matching.md  → Why regex instead of ML
│       ├── 005-weighted-scoring-with-dampening.md → How scoring works
│       └── 006-defer-shared-to-core-rename.md    → Why we didn't rename shared/ yet
│
├── product/                               → WHAT we're building as a product
│   ├── product-spec.md                    → Product definition and competitive landscape
│   ├── user-personas.md                   → Who uses SafePaste and what they need
│   ├── use-cases.md                       → Specific user stories
│   └── pricing-model.md                   → Pricing tiers and philosophy
│
├── roadmap/                               → WHERE we're going
│   └── sdk-roadmap.md                     → 4-phase plan: Core → Test → Guard → Cloud
│
├── testing/                               → HOW we verify quality
│   └── testing-strategy.md                → Test coverage, metrics, CI/CD targets
│
├── security/                              → CORE INTELLECTUAL PROPERTY
│   ├── threat-model.md                    → What attacks look like, trust boundaries
│   ├── attack-taxonomy.md                 → Classification of all attack types
│   ├── detection-strategies.md            → How detection works technically
│   ├── evaluation-methodology.md          → How to measure detection quality
│   └── research-log.md                    → Running log of security discoveries
│
├── community/                             → HOW others can contribute
│   ├── contributing.md                    → How to add patterns, examples, report bugs
│   ├── open-source-strategy.md            → When/how to open-source
│   └── research-publications.md           → Potential research papers
│
└── project-state/                         → WHERE we are right now
    ├── current-state.md                   → What's live and working
    ├── implementation-status.md           → Feature-by-feature status table
    ├── known-risks.md                     → What could go wrong
    └── next-milestones.md                 → What to build next
```

**How Claude uses these:** Claude reads specific docs when relevant. Starting a session? It reads `current-state.md`. Working on detection? It reads `attack-taxonomy.md` and `detection-strategies.md`. Making an architecture choice? It reads existing ADRs to stay consistent.

**How you use these:**
- `project-compass.md` — read when you need to remember what you're building and why
- `backlog.md` — read when deciding what to work on next
- `session-log.md` — read when you want to see what happened across all sessions
- `known-risks.md` — read when you're worried about what might break
- `implementation-status.md` — read when you want a quick "what's done?" overview
- `sdk-roadmap.md` — read when thinking about the long-term product vision

**Team benefit:** A new developer reads `docs/README.md` to understand the structure, then reads whichever section is relevant to their work. The ADRs are especially valuable — they explain WHY things are the way they are, so a new developer doesn't accidentally undo past decisions.

#### Datasets

```
SafePaste/datasets/prompt-injection/
├── README.md                    → What the dataset is and how to use it
├── format.md                    → JSONL format specification
└── examples/
    └── sample-attacks.jsonl     → 5 seed examples (attacks, benign, edge-cases)
```

**How Claude uses these:** When working on detection patterns, Claude can reference these examples to test changes. The format is machine-readable (JSONL — one JSON object per line).

**How you use these:** Add examples over time. When you encounter a prompt injection attack in the wild, add it to the dataset. When you find a false positive, add the benign text. The dataset grows into a benchmark for measuring detection quality.

---

## The Session Workflow (Step by Step)

### Starting a Session

1. Open Claude Code in the SafePaste directory
2. Type `/session-start`
3. Claude will:
   - Read MEMORY.md (auto-loaded) to see where you left off
   - Run `git status` and `git log` to check the repo state
   - Check if there's an unfinished task in `active-work.md`
   - Check if there are open bugs in `bugs-open.md`
   - Read `current-state.md` for the project snapshot
   - Present a brief summary: last session, git state, active work, open bugs
   - Ask you what you want to work on
4. You tell Claude what to do, and work begins

### During a Session

Work normally. Write code, fix bugs, discuss architecture. The system doesn't require any special behavior during a session. Just a few things to know:

- If you make an architecture decision, you can type `/new-decision` to record it as an ADR right then
- If you think of a feature idea, type `/backlog-add` to add it to the backlog
- If you discover a security insight, mention it — Claude will record it in the research log at session end
- If you finish a feature, type `/feature-closeout` to update all the status tracking

### Ending a Session

1. Type `/session-end`
2. Claude will:
   - Review the conversation and summarize what happened
   - Add a 3-line entry to `docs/session-log.md` (Built, Decided, Next)
   - Update `MEMORY.md` with current state and what the next session should know
   - Update `active-work.md` (clear it if done, or record stopping point)
   - Update `bugs-open.md` (add new bugs, delete fixed ones)
   - Update `docs/project-state/` if significant changes happened
   - Promote any architecture decisions to ADRs
   - Promote any security discoveries to the research log
   - Add any new backlog items
   - Stage and commit the changes (won't push unless you ask)
   - Tell you what was recorded and what to do next time

### What This Looks Like Over 200 Sessions

- `session-log.md` grows — a complete history of everything you built
- `MEMORY.md` stays small — always just the latest state (under 50 lines)
- `active-work.md` gets created and deleted repeatedly — it tracks one task at a time
- `bugs-open.md` fluctuates — bugs appear and get deleted when fixed
- ADRs accumulate — a permanent record of every important decision
- `research-log.md` grows — a running log of security discoveries
- `backlog.md` evolves — items get added, prioritized, and moved to "Completed"
- `implementation-status.md` fills out — more features marked "Done" over time

---

## For Other Developers (Git + GitHub)

### What's Shared via Git

When you commit and push, other developers who clone the repo get:

| What | Where | They Get It? |
|------|-------|-------------|
| All source code | packages/ | Yes |
| Slash commands | .claude/commands/ | Yes — they can use /session-start etc. |
| CLAUDE.md | repo root | Yes — Claude reads it automatically |
| All documentation | docs/ | Yes |
| Datasets | datasets/ | Yes |
| Session log | docs/session-log.md | Yes — they can see all past sessions |
| ADRs | docs/architecture/decisions/ | Yes — they see why decisions were made |
| Backlog | docs/backlog.md | Yes — they see what needs building |

### What's NOT Shared (Private to Your Machine)

| What | Where | Why Private |
|------|-------|-------------|
| MEMORY.md | ~/.claude/projects/.../memory/ | Session continuity is per-developer |
| active-work.md | ~/.claude/projects/.../memory/ | Your current task, not theirs |
| bugs-open.md | ~/.claude/projects/.../memory/ | Your working context |
| user-prefs.md | ~/.claude/projects/.../memory/ | Your preferences |

This is fine — each developer's Claude Code builds its own memory over time. The important project knowledge is all in docs/ (shared via git).

### What a New Developer's First Session Looks Like

1. They clone the repo: `git clone https://github.com/Rocco-alt/safepaste.git`
2. They open it in Claude Code
3. Claude auto-reads CLAUDE.md and knows the project structure
4. They type `/session-start`
5. Claude won't find MEMORY.md (it's new for them), but it WILL read `docs/project-state/current-state.md` and present the project status
6. They're oriented and ready to work
7. Over time, their own MEMORY.md builds up with their working context

### What Needs to Happen Before Pushing

Right now, nothing is committed. There are also some files in your repo root that should NOT be committed:

- `SAFEPASTE API KEYS.docx` — **NEVER commit this.** Contains secrets.
- Various screenshot PNGs and .docx files — these are marketing/demo assets, not source code
- `SafePaste-Release/` and `SafePaste-1.0.0 test unzip/` — build artifacts

You should add these to `.gitignore` before committing.

---

## Quick Reference: When to Use Each Command

| Situation | Command |
|-----------|---------|
| Starting a new work session | `/session-start` |
| Done working for now | `/session-end` |
| Made an important design choice | `/new-decision` |
| Thought of a feature to build later | `/backlog-add` |
| Finished building a feature | `/feature-closeout` |

---

## Quick Reference: Where to Find Things

| I Want To... | Look At... |
|-------------|-----------|
| See what's been built | `docs/project-state/implementation-status.md` |
| See what to work on next | `docs/backlog.md` or `docs/project-state/next-milestones.md` |
| Understand why a decision was made | `docs/architecture/decisions/` |
| See how the code fits together | `docs/architecture/repo-map.md` and `data-flow.md` |
| Understand the security model | `docs/security/threat-model.md` |
| See what attacks we detect | `docs/security/attack-taxonomy.md` |
| See the product vision | `docs/project-compass.md` |
| See the long-term roadmap | `docs/roadmap/sdk-roadmap.md` |
| See past session history | `docs/session-log.md` |
| Know what's risky | `docs/project-state/known-risks.md` |
| Add a detection pattern | CLAUDE.md "Adding a Detection Pattern" section |
