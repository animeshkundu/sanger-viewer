# AGENTS.md

sanger-viewer is a browser-native Sanger chromatogram workbench for bench scientists. The app opens `.ab1` and `.scf` trace files locally in the browser, keeps sequencing data private, and ships as a client-side TypeScript/Vite app on GitHub Pages at the `/sanger-viewer/` project base path.

## Agent workflow

1. Keep changes surgical and focused on Sanger viewer behavior.
2. Preserve the client-side-only architecture: no backend, no server persistence, no trace uploads.
3. Preserve GitHub Pages project base path support. Production builds use `/sanger-viewer/`.
4. Use TypeScript and existing modules for parser, workspace, and rendering changes.
5. Keep parser fixtures and tests in sync when adding formats or changing trace parsing.
6. Update the human-voice devlog for shipped changes; update `vite.config.ts` and `blog/index.html` whenever adding a devlog entry.
7. Leave durable knowledge in `LEARNINGS.md`, and add an ADR under `docs/adr/` when a decision affects future architecture, agent workflow, UX gates, or validation strategy.
8. Do not remove or weaken existing guidance, tests, CI gates, UX gates, or GitHub Pages behavior.

## Target audience and UX bar

- Primary users are bench scientists who need fast, trustworthy trace review without installing desktop software.
- Optimize for true-user flows: open a trace, inspect peaks/quality, edit or review calls, compare reads, export/share results, and recover from invalid files.
- UX-affecting PRs must capture screenshots for all key UX states across desktop, tablet, and mobile via the UX gallery gate, then include a written "is this great UX / what should improve" review grounded in those screenshots.
- Keep accessibility measurable: keyboard operability, visible focus, reduced-motion behavior, and contrast must stay covered when visual or layout changes are made.

## Validation commands

Run the smallest relevant validation first, then the full set before finalizing code changes:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run perf:smoke
npm run ux:gallery
npm run build
```

If Playwright browsers are missing locally, install the same browser CI uses:

```bash
npx playwright install --with-deps chromium
```

## Definition of Done

- The change is small, reviewable, and directly tied to the issue.
- Lint, typecheck, unit tests, relevant E2E/perf checks, and build pass, or any pre-existing environment failure is clearly documented.
- UX-affecting work includes the UX gallery artifact plus written assessment for desktop, tablet, and mobile states.
- Devlog, ADR, and `LEARNINGS.md` are updated when the work creates durable product, architecture, or workflow knowledge.
- No secrets, no new trace-data upload path, no broken GitHub Pages base path, and no capability regressions.
