# User Personas

## Persona 1: Security-Aware Developer

A software developer building an AI-powered application (chatbot, agent, copilot) who wants to protect their product from prompt injection attacks. They integrate the SafePaste API into their backend to scan user inputs before passing them to an LLM.

**Needs:**
- Low latency detection (<10ms) that doesn't slow down their application
- Clear, structured API responses they can build logic on (not just "safe/unsafe")
- Batch scanning for processing documents or message histories
- Predictable pricing with a generous free tier for development
- Transparent detection methodology so they can explain flagged content to their users

**Current gaps:**
- No SDK/client library — developers must write raw HTTP calls
- No webhook or streaming support for async pipelines
- No custom pattern configuration (can't add domain-specific patterns)

## Persona 2: Cautious AI User

A knowledge worker who regularly uses AI chat tools (ChatGPT, Claude, Gemini) and copies text from various sources — emails, documents, web pages, code repositories — to paste into these chats. They may not understand prompt injection technically but want to be protected from it.

**Needs:**
- Zero-configuration protection that works immediately after install
- Clear, non-technical warnings when something looks suspicious
- The ability to override warnings when they know the paste is safe
- No data collection — they paste sensitive work content and expect privacy
- Works on the AI chat sites they actually use

**Current gaps:**
- Warning messages could be more accessible to non-technical users
- No "learn more" educational content in the extension itself
- No way to report false positives from within the extension

## Persona 3: Enterprise Security Team

A security or IT team evaluating tools to protect their organization's AI usage. They need to ensure employees aren't inadvertently pasting compromised content into AI assistants, especially when handling sensitive corporate data.

**Needs:**
- Deployable across the organization (Chrome enterprise policy)
- Audit trail of detected threats (what was flagged, when, by whom)
- Self-hosted API option for data sovereignty
- Compliance documentation (how detection works, what data is processed)
- SLA and support guarantees

**Current gaps:**
- No enterprise deployment documentation
- No audit logging or detection event export
- No self-hosted deployment guide
- No admin dashboard for organizational oversight
- No SLA or formal support tiers

## Persona 4: AI Security Researcher

An academic or industry researcher studying prompt injection attacks, LLM security, or AI safety. They are interested in SafePaste's detection methodology, attack taxonomy, and datasets for their own research.

**Needs:**
- Transparent, well-documented detection methodology
- Access to the attack taxonomy and pattern library
- A labeled dataset of prompt injection examples for benchmarking
- A way to contribute new attack patterns or examples
- Citable documentation or publications

**Current gaps:**
- Dataset is just starting (seed examples only)
- No formal publication or citable paper
- Contributing workflow is documented but the project is not yet open-source
- No benchmarking harness for comparing detection tools
