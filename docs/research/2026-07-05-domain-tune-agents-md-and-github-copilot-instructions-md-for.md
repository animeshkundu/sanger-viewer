# Research: domain-tune agent guidance and cloud setup

Date: 2026-07-05

## Scope researched

Work unit: domain-tune `AGENTS.md` and `.github/copilot-instructions.md` for sanger-viewer, add or enhance `.github/workflows/copilot-setup-steps.yml` so future cloud-agent sessions have dependencies and Playwright browsers ready, and populate `LEARNINGS.md` conventions. This research supports the implementation plan only; no product code changes are part of this artifact.

## Current repository facts

- `AGENTS.md` is very small and currently only says to run lint/typecheck/tests after code changes, keep changes surgical and focused on Sanger viewer behavior, and preserve GitHub Pages project base path support.
- `.github/copilot-instructions.md` is also minimal: use TypeScript and existing modules for parser/rendering work, keep parser fixtures/tests in sync, and run `npm run lint && npm run typecheck && npm run test` before finalizing.
- `.github/workflows/copilot-setup-steps.yml` does not exist yet, so the implementation should create it rather than edit an existing setup workflow.
- CI runs on Node.js 22 and executes `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
- `package.json` scripts are:
  - `npm run dev` -> `vite`
  - `npm run build` -> `npm run typecheck && vite build`
  - `npm run preview` -> `vite preview`
  - `npm run typecheck` -> `tsc --noEmit`
  - `npm run lint` -> `eslint .`
  - `npm run test` -> `vitest run`
  - `npm run test:e2e` -> `playwright test`
  - `npm run perf:smoke` -> `vitest run tests/core/performance-smoke.test.ts`
  - `npm run ux:gallery` -> `playwright test tests/e2e/ux-gallery.e2e.test.ts && tsx scripts/generate-ux-gallery-html.ts`
- `README.md` describes the app as a browser-native, private-by-default Sanger workbench for `.ab1` and `.scf` files, with in-browser parsing/rendering/export and a live GitHub Pages demo at `https://animeshkundu.github.io/sanger-viewer/`.
- `README.md` documents GitHub Pages production base path `/sanger-viewer/` and the static devlog at `/sanger-viewer/blog/`.
- `playwright.config.ts` defines desktop, tablet, and narrow-mobile projects. The narrow-mobile project is limited to UX gallery and front-door-polish specs.
- `tests/e2e/ux-gallery.e2e.test.ts` is the v28 UX-screenshot gate. It captures a full state × theme × viewport matrix, asserts completeness, checks chromatogram canvases are non-blank, and writes screenshots to `ux-gallery-screenshots/`.
- `.github/pull_request_template.md` makes the UX gallery and written UX assessment mandatory for every PR, with desktop/tablet/narrow-mobile coverage and accessibility checks for visual/layout work.
- `blog/index.html` is a hand-maintained devlog index. New devlog entries require both a new `blog/YYYY-MM-DD-.../index.html` page and a corresponding `vite.config.ts` Rollup input entry so GitHub Pages builds include the page.
- `docs/adr/` does not exist yet.
- `LEARNINGS.md` does not exist yet.
- `docs/plans/` does not exist yet.
- `docs/research/` already exists and contains `next-killer-features.md`.

## Domain guidance that should be added

The guidance files should explicitly say that sanger-viewer is a client-side TypeScript/Vite Sanger trace viewer for bench scientists who need fast, private review of `.ab1`/`.scf` chromatograms in a browser. They should preserve the existing TypeScript/parser/rendering guidance while adding the repo's actual validation commands, GitHub Pages base-path rule, UX-screenshot gate, small-PR discipline, devlog requirement, ADR/LEARNINGS conventions, and a Definition of Done.

## Cloud setup requirements

Because the setup workflow is absent, create `.github/workflows/copilot-setup-steps.yml` with one job named exactly `copilot-setup-steps`. Keep `timeout-minutes` at or below 59. Match CI's Node.js major version (`22`), use npm cache, run `npm ci`, and install Playwright's Chromium browser with OS dependencies via `npx playwright install --with-deps chromium` so future sessions can run true-user E2E and UX gallery capture without rediscovering browser setup.

## Documentation conventions to introduce

- `LEARNINGS.md`: short durable lessons for future contributors/agents, with source/date and concrete implication.
- `docs/adr/`: Architecture Decision Records for durable process or architecture decisions. Add one real ADR for the agentic-development setup decision.
- Devlog: add a human-voice entry for this setup work, update `blog/index.html`, and update `vite.config.ts` if a new devlog page is added.

## Risks and open constraints

- The repository instructions for this session prohibit accessing `.github/agents/` files. This work unit should not modify those files; implementation should preserve them and avoid weakening any existing custom-agent content.
- Creating a new devlog page is a code-adjacent docs change because `vite.config.ts` must include the page as a Rollup input for GitHub Pages output.
- The strict Definition of Done says to add tests that would fail without the change. For a guidance/workflow/docs work unit, product behavior tests may not be meaningful. The implementation should avoid artificial tests and instead explicitly report this as not applicable unless a lightweight repository-convention test already exists or is requested.
- Installing Playwright browsers in setup increases setup time; using Chromium only matches current CI and keeps the job under the 59-minute maximum.
- Do not remove or weaken existing guidance. Edits should expand the current content rather than replace it wholesale.
