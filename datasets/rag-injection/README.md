# RAG Injection Dataset

A structured collection of RAG (Retrieval-Augmented Generation) injection examples for testing detection of attacks embedded in documents that LLMs retrieve and process.

## Purpose

- Evaluate detection of attacks hidden in retrieved documents
- Test across different document formats (markdown, HTML, PDF, etc.)
- Identify detection gaps in document-level injection vectors
- Benchmark RAG-specific safety measures

## Directory Structure

```
datasets/rag-injection/
├── README.md           # This file
├── format.md           # Dataset format specification
├── curated/            # Hand-reviewed, high-confidence examples
├── generated/          # Deterministic mutation pipeline output
├── scraped/            # Raw ingestion from public sources
├── telemetry/          # Real-world collection (sanitized)
├── training/           # PARTITION: ~60%
├── validation/         # PARTITION: ~20%
├── benchmark/          # PARTITION: ~20% (FROZEN)
└── versions/           # Immutable versioned snapshots
```

## 7 Attack Categories

| # | Category | Description |
|---|----------|-------------|
| 1 | markdown_document_injection | Instructions hidden in markdown documents |
| 2 | html_hidden_prompt | Prompts hidden in HTML comments/hidden elements |
| 3 | pdf_instruction_injection | Instructions embedded in PDF content |
| 4 | readme_repo_injection | Instructions injected via repository files |
| 5 | invisible_unicode_injection | Hidden instructions via invisible unicode |
| 6 | documentation_poisoning | Instructions embedded in documentation |
| 7 | benign | Non-attack documents |

## Usage

```bash
node scripts/dataset/validate.js datasets/rag-injection/curated/ --strict
node scripts/dataset/evaluate.js datasets/rag-injection/curated/
```

Note: RAG injection detection is not yet implemented in the SafePaste engine. All attack examples will be classified as "not currently detected."
