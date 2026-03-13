# Session Log

## Session #1 — 2026-03-12
- **Built:** Full documentation system (46 files) — slash commands, architecture maps, 6 ADRs, security docs, product docs, SDK roadmap, testing strategy, datasets, community docs, owner's guide; updated .gitignore
- **Decided:** Keep packages/shared/ (defer core rename to SDK Phase 1, ADR-006); separated AI memory from version-controlled project docs; JSONL format for dataset
- **Next:** Verify slash commands work after session restart; pick first backlog item to build

## Session #2 — 2026-03-13
- **Built:** Dataset pipeline architecture (docs/architecture/dataset-pipeline.md) — 17 attack categories, stratified partitioning, benchmark freeze policy, telemetry, safety isolation, 5-phase implementation plan; fixed slash commands with YAML frontmatter
- **Decided:** Stratified partitioning by category (not hash-based); deterministic-only mutations (no LLM); mandatory licensing metadata for scraped data; required example IDs (safepaste_pi_NNNNNN format)
- **Next:** Verify slash commands work after restart; implement dataset pipeline Phase 0 (lib/ + validate.js + evaluate.js)
