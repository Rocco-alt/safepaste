# Session Log

## Session #1 — 2026-03-12
- **Built:** Full documentation system (46 files) — slash commands, architecture maps, 6 ADRs, security docs, product docs, SDK roadmap, testing strategy, datasets, community docs, owner's guide; updated .gitignore
- **Decided:** Keep packages/shared/ (defer core rename to SDK Phase 1, ADR-006); separated AI memory from version-controlled project docs; JSONL format for dataset
- **Next:** Verify slash commands work after session restart; pick first backlog item to build

## Session #2 — 2026-03-13
- **Built:** Dataset pipeline architecture (docs/architecture/dataset-pipeline.md) — 17 attack categories, stratified partitioning, benchmark freeze policy, telemetry, safety isolation, 5-phase implementation plan; fixed slash commands with YAML frontmatter
- **Decided:** Stratified partitioning by category (not hash-based); deterministic-only mutations (no LLM); mandatory licensing metadata for scraped data; required example IDs (safepaste_pi_NNNNNN format)
- **Next:** Verify slash commands work after restart; implement dataset pipeline Phase 0 (lib/ + validate.js + evaluate.js)

## Session #3 — 2026-03-13
- **Built:** Dataset pipeline Phase 0 (6 lib modules, validate.js, evaluate.js, diagnose.js, stats.js, view.js) + Phase 1 seed dataset (69 curated prompt-injection examples across 17 categories, 17 RAG-injection examples across 7 categories); added context_type field; 7 npm scripts
- **Decided:** Quality over quantity for seed data (~70 not ~220); no pattern-mirroring in examples; difficulty balance (easy+hard per category); context_type metadata for wrapper analysis; mutation pipeline deferred to Phase 2 for volume expansion
- **Next:** Implement Phase 2 — mutate.js (7 deterministic strategies), merge.js, version.js; carry forward mutation constraints (attack-only, ≤5 variants/seed, inherited fields, benchmark exclusion)

## Session #4 — 2026-03-13
- **Built:** Dataset pipeline Phase 2 — mutations.js (7 strategies), mutate.js, merge.js, version.js; 55 seeds → 247 generated variants; 316 total records partitioned; v0.1.0 snapshot created; evaluate.js extended with --group-by and module exports
- **Decided:** Generated records excluded from benchmark (curated-only); benchmark pinning from previous versions for partition stability; 75/25 train/val split for generated; deterministic IDs (gen_<seed>_<strategy>_<hash8>)
- **Next:** Phase 3 — ingestion adapters (HuggingFace, GitHub, CSV); or improve detection recall on mutation variants (encoding strategy 0% recall, context_embedding 49%)

## Session #5 — 2026-03-14
- **Built:** Detection hardening — 9 regex synonym expansions, encoding weight 22→35, dampening 0.75→0.85, newline collapse in normalizeText(); fixed critical normalization-matching disconnect (findMatches now receives normalized text); added /deep-review slash command; evaluator mutation_label_divergence diagnostic; v0.2.0 dataset snapshot
- **Decided:** normalizeText() must feed findMatches() (not raw text); expected_flagged is engine-independent ground truth (mutations inherit, no recomputation); encoding.obfuscated at w:35 is correct for middleware; mutation label divergence reported separately from FPs
- **Next:** Phase 3 ingestion adapters; or expand curated corpus (benchmark has only 5 records); or tackle 7 undetected attack classes
