# Threat Model

## What SafePaste Protects Against

Attacks delivered through untrusted input that manipulate AI behavior and execution — instruction override, data exfiltration, tool manipulation, role hijacking, system prompt extraction, jailbreaks, and more across 13 categories. SafePaste operates at points where untrusted input meets AI systems: paste events, API requests, and agent tool calls.

## Threat Actors

- **Malicious content creators** who embed attack payloads in web pages, documents, or code snippets that users are likely to copy
- **Adversarial inputs** disguised as legitimate content (emails, code, documentation, Stack Overflow answers)
- **Automated attack tools** that generate prompt injection and agent manipulation payloads (growing in sophistication)
- **Social engineers** who craft text that combines legitimate content with hidden attack payloads
- **Indirect injection sources** — web pages, API responses, tool outputs, and documents that agents process, containing embedded attack payloads

## Attack Surfaces

- **User clipboard** — the primary vector for the extension. Users copy text from untrusted sources and paste into AI chats.
- **AI chat input fields** — where injected text reaches the AI model. SafePaste intercepts at the paste event, before the text enters the input field.
- **API request body** — for server-side detection, the text field in POST /v1/scan requests.
- **Agent tool inputs/outputs** — for Guard middleware, text flowing through agent pipelines. Tool responses from web scraping, document retrieval, or API calls can contain embedded attack payloads.

## Trust Boundary Model

SafePaste operates at three boundaries between trusted and untrusted input:

| Boundary | Delivery | What Crosses | SafePaste's Role |
|----------|----------|-------------|-----------------|
| User paste → AI chat | Chrome extension | Clipboard text from untrusted sources | Warns user before text reaches input (advisory) |
| External input → Application | REST API | User messages, document content, external data | Returns detection result for developer to act on (informational) |
| Tool output → Agent | Guard middleware | Web pages, API responses, file content | Scans and can warn, log, or block (configurable enforcement) |

**We trust:**
- The browser and Chrome APIs (extension runs in a trusted environment)
- The user's intent to paste (we warn, not block — user has final say in the extension)
- Our own detection engine code (not externally modifiable at runtime)
- The developer's judgment (API returns results; the developer decides action)

**We do NOT trust:**
- Clipboard content (the primary attack vector for the extension)
- Pasted text content (may contain obfuscated attacks)
- Text appearing in input fields after paste (for post-paste fallback detection)
- Tool outputs in agent pipelines (may contain indirect injection payloads)
- External data sources (web pages, documents, API responses processed by agents)

## Assumptions

- Attacker can craft arbitrary text that the user might copy from any source
- Attacker can embed payloads in content that agents process through tools
- Attacker cannot control the extension code or API server directly
- User may not recognize attacks embedded in otherwise legitimate text
- Detection is best-effort — we aim to catch known patterns, not all possible attacks
- Attackers will adapt to known detection patterns over time

## Limitations by Capability

### Deterministic Enforcement (current) — cannot detect:
- **Semantic/reasoning-chain attacks** — attacks that manipulate through logical reasoning rather than syntactic patterns. *Structured learning may develop patterns for observable variants. Automated intelligence (ML classifier) would address this directly.*
- **Image-based attacks** — attacks embedded in screenshots, PDFs rendered as images, or other media formats. *Not addressable by text-based enforcement. Future image analysis capability needed.*
- **Novel zero-day attacks** — attack techniques with no matching pattern will pass through undetected. *Structured learning addresses this: real-world observations surface new patterns. Automated intelligence (semantic similarity) would catch variants of known attacks.*
- **Sufficient obfuscation** — rephrasing, encoding, or character substitution beyond normalization. *Normalization is continuously hardened (26 invisible chars, separator collapse). Automated intelligence (ML) would address obfuscation-resistant detection.*
- **Cross-message context** — each input is analyzed independently; multi-turn manipulation across separate inputs is not correlated. *Stateful analysis is a future capability beyond current enforcement architecture.*
- **Unicode homograph attacks** — NFKC normalization handles common cases but not all visually similar characters from different scripts. *Normalization is continuously expanded.*
- **Multilingual attacks** — current patterns are English-only; attacks in other languages are not detected. *Multilingual pattern development is a backlog item.*

### Structured Learning (operational infrastructure) — current gaps:
- No automated orchestration — improvement cycles depend on human-initiated development sessions
- Telemetry coverage limited to API — extension is local-only (ADR-003), so no visibility into paste-boundary attacks
- Feedback volume depends on adoption — more API usage = more observations = faster learning

### Automated Intelligence (future) — when built, would address:
- Semantic attacks via ML classifier
- Novel variants via embedding similarity
- Obfuscation evasion via learned features (not dependent on regex)
- Browser-local ML for extension (small models via ONNX/TF.js)
