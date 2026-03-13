# RAG Injection Dataset Format

## File Format

JSONL (JSON Lines) — one JSON object per line.

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. Format: `safepaste_rag_NNNNNN` |
| `text` | string | The document content to analyze |
| `label` | string | One of: `"attack"`, `"benign"`, `"edge-case"` |
| `category` | string | RAG attack category (see below) |
| `expected_flagged` | boolean | Whether SafePaste should flag this |
| `source` | string | Where the example came from |

## RAG-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `document_type` | string | Required for attacks: `"markdown"`, `"html"`, `"pdf"`, `"readme"`, `"documentation"`, `"plaintext"` |
| `injection_location` | string | Optional: `"header"`, `"body"`, `"footer"`, `"metadata"`, `"comment"`, `"hidden"` |

## Optional Fields

Same as prompt-injection format: `expected_score_range`, `difficulty`, `notes`, `date_added`, `context_type`, `mutation_type`, `parent_hash`, `partition`, `timestamp`.

## Category Values

- `markdown_document_injection` — instructions injected into markdown documents
- `html_hidden_prompt` — prompts hidden in HTML comments or hidden elements
- `pdf_instruction_injection` — instructions embedded in PDF content
- `readme_repo_injection` — instructions injected via repository files
- `invisible_unicode_injection` — hidden instructions via invisible unicode characters
- `documentation_poisoning` — instructions embedded in technical documentation
- `benign` — non-attack documents
