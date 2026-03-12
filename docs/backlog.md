# Feature Backlog

## High Priority

- **ML-based detection** — Add a machine learning classifier as a second opinion alongside regex. Would catch semantic attacks that regex misses. Blocked by: need training data and evaluation methodology.
- **Extension automated testing** — Currently only the API has tests. The extension has zero automated tests, which is a significant risk for a security tool.
- **CI/CD pipeline** — No automated testing or deployment. Changes go directly to production with manual testing only.

## Medium Priority

- **Monitoring and alerting** — No visibility into API production behavior. Need basic health monitoring.
- **Redis-based rate limiting** — Current in-memory rate limiting resets on server restart and doesn't scale to multiple servers.
- **User feedback loop** — Allow users to report false positives/negatives to improve detection quality over time.
- **Pattern auto-generation** — Generate detection patterns from attack datasets instead of hand-writing regex.

## Low Priority

- **Token smuggling detection** — Detect homograph/lookalike Unicode character attacks.
- **Multi-turn manipulation detection** — Detect attacks that build trust across multiple messages.
- **Image-based attack detection** — Analyze text embedded in screenshots/images.
- **Browser-based ML inference** — Run ML models locally in the extension for sophisticated detection without API calls.
- **Community pattern contributions** — Allow security researchers to submit new detection patterns.

## Completed

(Items move here when done, with completion date)
