# Next Milestones

## Milestone 1: Extension Test Coverage
- **Goal:** Add automated tests for the Chrome extension to catch regressions before they ship
- **Includes:** Unit tests for detector.js, content.js paste interception logic, and settings persistence
- **Blocked by:** Need to choose a browser testing approach (Jest + jsdom, Puppeteer, or Chrome Extension Testing framework)

## Milestone 2: CI/CD Pipeline [COMPLETED]
- **Goal:** Automate testing and deployment so that every commit is validated and broken code can't ship
- **Includes:** GitHub Actions workflow running core unit tests, API integration tests, and extension sync check on every push/PR
- **Status:** Completed (session #9). 3 jobs: Tests Node 18, Tests Node 22, Extension sync check.

## Milestone 3: Detection Quality Improvement
- **Goal:** Reduce false negatives by expanding pattern coverage for under-detected attack categories
- **Includes:** New patterns for token smuggling, encoding chains, preamble confusion; expand test dataset with real-world attack examples
- **Blocked by:** Nothing — can start anytime with evaluation methodology in place

## Milestone 4: Monitoring and Observability
- **Goal:** Gain visibility into API production behavior so issues are detected before users report them
- **Includes:** Request logging, error tracking, latency monitoring, rate limit hit tracking
- **Blocked by:** Nothing — can be implemented incrementally

## Milestone 5: ML-Assisted Detection (Research Phase)
- **Goal:** Explore whether a machine learning classifier can catch attacks that regex misses
- **Includes:** Assemble training dataset, evaluate model options (fine-tuned classifier vs. embeddings), prototype and benchmark against regex-only detection
- **Blocked by:** Test dataset (part of Milestone 3), evaluation methodology (docs/security/evaluation-methodology.md)
