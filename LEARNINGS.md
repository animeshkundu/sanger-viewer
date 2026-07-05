# LEARNINGS.md

Durable notes for future sanger-viewer work.

## Agentic development setup

- Treat bench scientists as the primary reviewer for product decisions: optimize for fast trace opening, trustworthy peak/quality interpretation, privacy, and low cognitive load.
- Keep the app client-side only. `.ab1` and `.scf` parsing, rendering, sharing, and export should happen in-browser without trace uploads.
- Run Playwright against real browsers for true-user E2E. If the browser cache is missing, install Chromium with `npx playwright install --with-deps chromium` before `npm run test:e2e` or `npm run ux:gallery`.
- UX-affecting work is not done until desktop, tablet, and mobile screenshots are captured and reviewed with a written "is this great UX / what should improve" assessment.
- Preserve the small-PR rhythm: each meaningful feature or polish pass should update the devlog, and cross-cutting workflow or architecture decisions should get an ADR.
