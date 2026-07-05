# Copilot instructions

- sanger-viewer is a private-by-default, browser-native Sanger trace viewer/workbench for bench scientists. It opens `.ab1` and `.scf` files locally, renders chromatograms, supports quality review/editing/comparison/export, and must never upload trace data.
- The stack is client-side TypeScript on Vite, deployed to GitHub Pages with production base path `/sanger-viewer/`. Preserve that base path and avoid backend/server dependencies.
- Use TypeScript and existing modules for parser, workspace, and rendering changes. Keep parser fixtures and tests in sync when adding formats or changing trace parsing.
- Keep PRs small and CI-green. Do not remove or weaken existing tests, guidance, CI, the UX gallery gate, or GitHub Pages deployment behavior.
- Run `npm run lint && npm run typecheck && npm run test` before finalizing, plus the relevant commands below for the touched area.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run perf:smoke
npm run ux:gallery
npm run build
```

Use `npx playwright install --with-deps chromium` when the browser cache is missing before running E2E or UX gallery tests.

## UX screenshot gate

- Every UX-affecting PR must run or rely on the CI `ux-gallery` gate, which captures all key UX states across desktop, tablet, and mobile.
- Include a written UX assessment: "Is this great UX?", concrete improvements, accessibility measurements, and follow-up issues when needed.
- Validate true-user behavior, not just DOM internals: loading, empty/error states, trace inspection, keyboard/touch operation, export/share flows, and responsive layouts.

## Documentation conventions

- Update the human-voice devlog for shipped changes. If adding a devlog page, also add it to `blog/index.html` and `vite.config.ts`.
- Add or update ADRs in `docs/adr/` when decisions affect architecture, validation strategy, agent workflow, or persistent UX policy.
- Add durable lessons and recurring pitfalls to `LEARNINGS.md` so the next contributor starts with more context.

## Definition of Done

- Small, focused diff that fully addresses the issue.
- Relevant tests and full validation are green, or pre-existing environment limitations are explicitly reported.
- UX changes include screenshots and written review for desktop, tablet, and mobile states.
- Devlog/ADR/LEARNINGS are updated when applicable.
- No secrets, no trace uploads, no broken client-side privacy model, no GitHub Pages regression, and no unrelated rewrites.
