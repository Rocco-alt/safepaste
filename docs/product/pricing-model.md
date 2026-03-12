# Pricing Model

## Current Tiers

| Tier | Price | Rate Limit | Features |
|------|-------|------------|----------|
| Free | $0 | 30 req/min | Single scan, batch scan, pattern listing, usage stats |
| Pro | Paid (via Stripe) | 300 req/min | All Free features + higher rate limits |

## Extension Pricing

The Chrome extension is **free forever**. This is a core design decision (see ADR-003). The extension never phones home, never collects data, and never requires an account. Charging for the extension would undermine the trust proposition that makes it valuable.

## API Pricing Philosophy

- **Generous free tier** for individual developers, researchers, and prototyping. 30 requests per minute is enough to build and test an integration without cost.
- **Paid tier for production use.** When an application is live and processing real user traffic, the higher rate limit and reliability expectations justify a subscription.
- **Self-service signup.** Free tier via POST /v1/signup (email required). Pro tier via Stripe checkout (credit card required).

## Future Pricing Considerations

- **Enterprise tier** — self-hosted deployment, custom rate limits, audit logging, SLA, dedicated support. Priced per-seat or per-organization.
- **Volume discounts** — for high-throughput API customers who need thousands of scans per minute.
- **Research/education discount** — free or reduced pricing for academic institutions and security researchers contributing to the attack taxonomy or dataset.
- **SDK licensing** — when the SDK is published (roadmap Phase 1), it will be open-source (free to use). Revenue comes from the hosted API and enterprise features, not the detection engine itself.

## Revenue Model

The long-term revenue model is:
1. **Free extension** drives awareness and trust
2. **Free API tier** drives developer adoption
3. **Pro API tier** converts production usage to revenue
4. **Enterprise tier** serves organizations with compliance and support needs
5. **SafePaste Cloud** (roadmap Phase 4) adds analytics dashboard and team management as premium features
