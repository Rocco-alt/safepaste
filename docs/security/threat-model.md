# Threat Model

## What SafePaste Protects Against

Prompt injection attacks delivered via copy-paste into AI chat interfaces. The goal is to warn users before manipulated text reaches an AI model.

## Threat Actors

- **Malicious content creators** who embed injection payloads in web pages, documents, or code snippets that users are likely to copy
- **Adversarial inputs** disguised as legitimate content (emails, code, documentation, Stack Overflow answers)
- **Automated attack tools** that generate prompt injection payloads (growing in sophistication)
- **Social engineers** who craft text that combines legitimate content with hidden injection payloads

## Attack Surfaces

- **User clipboard** — the primary vector. Users copy text from untrusted sources and paste into AI chats. The text may contain hidden or disguised injection payloads.
- **AI chat input fields** — where injected text reaches the AI model. SafePaste intercepts at the paste event, before the text enters the input field.
- **API request body** — for server-side detection, the text field in POST /v1/scan requests.

## Trust Boundaries

**We trust:**
- The browser and Chrome APIs (extension runs in a trusted environment)
- The user's intent to paste (we warn, not block — user has final say)
- Our own detection engine code (not externally modifiable at runtime)

**We do NOT trust:**
- Clipboard content (the primary attack vector)
- Pasted text content (may contain obfuscated attacks)
- Text appearing in input fields after paste (for post-paste fallback detection)

## Assumptions

- Attacker can craft arbitrary text that the user might copy from any source
- Attacker cannot control the extension code or API server directly
- User may not recognize prompt injection attacks embedded in otherwise legitimate text
- Detection is best-effort — we aim to catch common, recognizable patterns, not all possible attacks
- Attackers will adapt to known detection patterns over time

## Limitations

- **Cannot detect semantic/reasoning-chain attacks** — attacks that manipulate through logical reasoning rather than syntactic patterns are invisible to regex
- **Cannot analyze images or non-text content** — attacks embedded in screenshots, PDFs rendered as images, or other media formats are not detected
- **Cannot detect attacks with no known pattern** — novel attack techniques with no matching regex will pass through undetected
- **Regex patterns can be evaded** — sufficient obfuscation, rephrasing, or encoding beyond our normalization will bypass detection
- **No cross-message context** — each paste is analyzed independently; multi-turn manipulation across separate pastes is not detected
- **Unicode normalization is incomplete** — NFKC normalization handles many cases but not all possible homograph attacks
