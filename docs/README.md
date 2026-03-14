# SafePaste Documentation

This directory contains permanent project knowledge for SafePaste. Everything here is version-controlled and survives machine changes.

## Structure

```
docs/
├── project-compass.md              # Strategic direction — what we're building and why
├── backlog.md                      # Feature backlog with priorities
├── session-log.md                  # History of development sessions
│
├── architecture/
│   ├── repo-map.md                 # Package structure + key files
│   ├── data-flow.md               # How data moves through the system
│   ├── dependency-map.md           # Package + external dependencies
│   └── decisions/                  # Architecture Decision Records (ADRs)
│       ├── index.md                # ADR index
│       └── NNN-title.md            # Individual decisions
│
├── product/
│   ├── product-spec.md             # Product definition, differentiators, competitive landscape
│   ├── user-personas.md            # Target user profiles and their needs
│   ├── use-cases.md                # User stories for each delivery mechanism
│   └── pricing-model.md            # Pricing tiers, philosophy, and future plans
│
├── roadmap/
│   └── sdk-roadmap.md              # 4-phase evolution: Core → Test → Guard → Cloud
│
├── testing/
│   └── testing-strategy.md         # API, extension, detection quality, CI/CD targets
│
├── security/
│   ├── threat-model.md             # What we defend against and assumptions
│   ├── attack-taxonomy.md          # Prompt injection attack categories
│   ├── detection-strategies.md     # How detection works and why
│   ├── evaluation-methodology.md   # How to measure detection quality
│   └── research-log.md             # Chronological security discoveries (append-only)
│
├── community/
│   ├── contributing.md             # How to contribute patterns, examples, and bug reports
│   ├── open-source-strategy.md     # When and how to open-source
│   └── research-publications.md    # Potential publications from SafePaste IP
│
└── project-state/
    ├── current-state.md            # What's live, what's working
    ├── implementation-status.md    # Feature-by-feature status
    ├── known-risks.md              # Technical, security, operational risks
    └── next-milestones.md          # Next development milestones
```

Also at the repo root: `datasets/prompt-injection/` — labeled examples for testing and benchmarking (see `datasets/prompt-injection/README.md`).

## Conventions

- **ADRs are never deleted.** Superseded ones get a status update.
- **Session log entries are 3 lines max.** Built, Decided, Next.
- **Security docs are core IP.** They should be the most actively maintained files here.
- **Research log is append-only.** Entries are never edited or deleted.
- **Architecture maps are updated only when architecture changes** — not every session.
- **No code snippets in docs.** Use file path references (e.g., `packages/core/detect.js:47`) instead.
