# Implementation Status

## Detection Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Regex pattern matching | Done | 36 patterns in 13 categories |
| Weighted scoring | Done | Weights 15-40, capped at 100 |
| Text normalization | Done | NFKC, zero-width char removal, whitespace collapse, lowercase |
| Benign context dampening | Done | 15% reduction for educational content |
| Exfiltration protection | Done | Exfiltration patterns never dampened |
| OCR heuristic | Done | Detects OCR-like text characteristics |
| ML-based detection | Not started | Future enhancement — see backlog |

## Dataset Pipeline

| Feature | Status | Notes |
|---------|--------|-------|
| Shared library (6 modules) | Done | schema, safety, io, categories, dedup, partition |
| Validation script | Done | validate.js — strict mode, licensing checks, ID uniqueness |
| Evaluation script | Done | evaluate.js — precision/recall/FP/FN, --partition flag, --json |
| Diagnostic script | Done | diagnose.js — pattern coverage, score distribution, category×score |
| Stats script | Done | stats.js — growth metrics, category/context distribution |
| View script | Done | view.js — safe escaped viewer, table/json/csv output |
| Curated dataset (PI) | Done | 111 examples, 17 categories, context_type metadata |
| Curated dataset (RAG) | Done | 17 examples, 7 categories |
| Mutation pipeline | Done | 7 strategies, 424 variants from 97 seeds, deterministic |
| Merge + partitioning | Done | 535 records → 392 train / 124 val / 19 benchmark |
| Versioning | Done | v0.3.0 snapshot, benchmark freeze enforcement |
| Ingestion adapters | Not started | Phase 3 — HuggingFace, GitHub, CSV, JSONL |
| Telemetry collection | Not started | Phase 4 — PII stripping, sanitization |

## Extension

| Feature | Status | Notes |
|---------|--------|-------|
| ChatGPT support | Done | chat.openai.com, chatgpt.com |
| Claude support | Done | claude.ai |
| Gemini support | Done | Shadow DOM via MutationObserver |
| Copilot support | Done | copilot.microsoft.com |
| Groq support | Done | chat.groq.com, console.groq.com |
| Grok support | Done | Post-paste fallback (grok.com) |
| Warning modals | Done | Red (high risk) and yellow (medium risk) |
| Settings page | Done | Per-site toggles, strict mode, threshold selection |
| Popup | Done | Quick toggle, status badge (green ON/gray OFF) |
| Background service worker | Done | Badge management |
| Automated tests | Not started | Only API has tests currently |

## API

| Feature | Status | Notes |
|---------|--------|-------|
| Single scan | Done | POST /v1/scan |
| Batch scan | Done | POST /v1/scan/batch (max 20 items) |
| Pattern listing | Done | GET /v1/patterns |
| Usage stats | Done | GET /v1/usage |
| Health check | Done | GET /v1/health |
| Key management | Done | Admin-only POST/DELETE /v1/keys |
| Per-key rate limiting | Done | Sliding window, in-memory |
| Global IP rate limiting | Done | express-rate-limit, 100/min fallback |
| PostgreSQL storage | Done | Optional, env var fallback |
| Stripe billing | Done | Pro tier checkout + webhooks |
| Free signup | Done | POST /v1/signup |
| Integration tests | Done | ~20 tests in packages/api/test.js |

## Website

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | Done | packages/website/index.html |
| API docs page | Done | packages/website/docs.html |
| Getting started page | Done | Most recent addition |

## Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| CI/CD pipeline | Not started | Manual testing and deployment |
| Monitoring/alerting | Not started | No visibility into production |
| Staging environment | Not started | Changes go directly to production |
| Redis rate limiting | Not started | In-memory only, resets on restart |
