# Known Risks

## Security Risks

- **Semantic attacks undetectable:** Regex cannot catch reasoning-chain attacks or context-dependent manipulation. An attacker who avoids all 19 known syntactic patterns can bypass detection entirely.
- **No image analysis:** Attacks embedded in images (screenshots, OCR bait) are invisible to the extension and API.
- **Pattern discovery via API:** Attackers could probe POST /v1/scan to systematically map detection boundaries and craft evasion payloads.
- **Rate limiting is in-memory:** Resets on server restart, allowing burst abuse after deploys. Does not work across multiple server instances.
- **No cross-paste context:** Each paste is analyzed independently. Multi-step attacks spread across several pastes are not correlated.
- **Unicode normalization gaps:** NFKC handles common cases but homograph attacks using visually similar characters from different scripts may bypass pattern matching.

## Technical Risks

- **No automated testing for extension:** Only the API has integration tests. Extension changes are validated manually, which means regressions can ship unnoticed.
- **In-memory rate limiting doesn't scale:** Tied to a single server process. Cannot be shared across instances or survive restarts.
- **No monitoring or alerting:** No visibility into API production behavior — errors, latency, or abuse are invisible until a user reports them.
- **Generated files can go stale:** If someone edits `packages/core/` without running `npm run build:extension`, the extension uses outdated detection logic.
- **No database migrations system:** Schema changes require manual SQL. The initDb function uses CREATE TABLE IF NOT EXISTS but has no formal migration tooling.

## Operational Risks

- **Solo developer:** No code review, single point of failure for knowledge and decision-making.
- **No CI/CD pipeline:** Manual testing and deployment increases the chance of shipping broken code.
- **No staging environment:** Changes go directly to production with no intermediate validation.
- **No backup strategy documented:** PostgreSQL data (API keys, customers) has no documented backup/restore process.
- **Chrome Web Store dependency:** Extension updates require Chrome Web Store review, which can take days and may be rejected.
