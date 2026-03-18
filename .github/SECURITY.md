# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SafePaste, please report it responsibly.

**Email:** Create a private security advisory on this repository using GitHub's [private vulnerability reporting](https://github.com/Rocco-alt/safepaste/security/advisories/new).

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if you have one)

**Response time:** I aim to acknowledge reports within 48-72 hours.

## Scope

The following are in scope for security reports:

- **Detection bypasses** — attack text that should be flagged but isn't. These are the most valuable reports.
- **False positives** — benign text that is incorrectly flagged as an attack.
- **Scoring issues** — attacks that are detected but scored below the flagging threshold.
- **Normalization bypasses** — Unicode or encoding tricks that evade normalization.
- **Regex denial of service (ReDoS)** — patterns that cause catastrophic backtracking.

## Out of Scope

- Social engineering attacks against the maintainer
- Issues in dependencies (report to the dependency maintainer)
- Issues requiring physical access

## Recognition

Security researchers who report valid bypasses will be credited in the changelog and release notes (unless they prefer to remain anonymous).
