# ADR-002: Vanilla JavaScript Only

**Date:** 2026-01-15
**Status:** accepted

## Context

SafePaste needs a technology stack for both the Chrome extension and the API server. Modern JavaScript projects commonly use TypeScript, bundlers (webpack, Vite), and frontend frameworks (React, Vue). We needed to decide the complexity level of the toolchain.

## Decision

Use pure vanilla JavaScript throughout — no TypeScript, no bundlers, no frontend frameworks. Node.js 18+ for the server, plain browser JavaScript for the extension. The only build step is the shared code sync script.

## Alternatives Considered

- **TypeScript:** Would add type safety and better IDE support — rejected because it adds a compile step, tsconfig management, and learning curve. The codebase is small enough (~2,800 lines) that type errors are manageable without it.
- **Bundler (webpack/Vite):** Would enable module imports in the extension — rejected because Chrome Manifest v3 loads scripts directly, and the IIFE wrapper from the build script is sufficient. No need for tree-shaking or code splitting at this scale.
- **React/Vue for extension UI:** Would give component-based UI — rejected because the extension UI is simple (a modal, a popup, a settings page). Vanilla DOM manipulation is sufficient and avoids framework bundle size.

## Consequences

- Positive: Zero build complexity. Anyone can read and modify the code without learning a toolchain.
- Positive: Fast development cycle — edit and reload, no compile step.
- Positive: Small extension bundle size (no framework overhead).
- Negative: No type safety. Bugs that TypeScript would catch at compile time become runtime errors.
- Negative: No IDE autocomplete for custom types across packages.

## Affected Files

- Every file in the repository (this is a project-wide decision)
