# ADR 0001: Domain-tuned agentic development setup

## Status

Accepted

## Context

sanger-viewer is a client-side TypeScript/Vite application for bench scientists reviewing Sanger chromatograms in the browser. Future development needs agents to understand the product domain, preserve the GitHub Pages deployment model, validate true-user browser behavior, and leave durable documentation behind after small PRs.

The repository already has strong validation commands and a UX gallery gate, but the top-level agent guidance was sparse and the cloud-agent setup workflow did not exist in this clone. Without explicit setup steps, agents may spend time rediscovering dependencies or fail Playwright E2E because browsers are missing.

## Decision

Domain-tune `AGENTS.md` and `.github/copilot-instructions.md` around the Sanger viewer product, bench-scientist audience, client-side TypeScript stack, GitHub Pages base path, exact validation commands, UX screenshot gate, small-PR rhythm, devlog updates, ADR updates, `LEARNINGS.md`, and a shared Definition of Done.

Add `.github/workflows/copilot-setup-steps.yml` with the required `copilot-setup-steps` job, a 59-minute timeout, Node 22 dependency installation, and `npx playwright install --with-deps chromium` so cloud agents can run true-user E2E and UX gallery checks.

Start `LEARNINGS.md` with durable notes about privacy, bench-scientist UX, Playwright browser installation, UX screenshots, and documentation expectations.

## Consequences

- Future cloud-agent sessions should begin with installed npm dependencies and Chromium available for Playwright.
- Agent guidance now points contributors toward the same validation and documentation bar used by CI and the PR template.
- Workflow changes remain small and scoped to setup; CI remains responsible for enforcing lint, typecheck, unit, E2E, perf smoke, build, and UX gallery gates.
- Documentation-only changes still need careful review, but they do not require artificial behavior tests.
