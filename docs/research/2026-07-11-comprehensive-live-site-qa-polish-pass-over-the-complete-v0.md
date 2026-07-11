# Comprehensive live-site QA + polish pass over v0-v15

Date: 2026-07-11  
Owner: @animeshkundu / Copilot task agent  
Controller marker: `357fc269-385c-410e-bd0e-f6b180960f16`

## Context

The requested work unit is not a feature slice; it is a user-like QA pass over the completed v0-v15 Sanger viewer surface, followed by small polish fixes for real issues found. The implementation PR must prove the pass happened with Playwright, at least two real AB1 fixtures, a human-voice devlog entry, and exact-value/behavior tests for every shipped fix.

The repository already contains a prior v15 QA pass, so the next implementation must avoid a superficial restatement. It should re-run the workflow against the current app, cover any later UI surfaces that can affect v0-v15 behavior, and explicitly document both passes and defects.

## Repository evidence gathered

- `package.json` defines the relevant validation commands: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, `npm run ux:gallery`, and `npm run build`.
- `playwright.config.ts` runs desktop Chrome, Chromium iPad emulation, and a narrow mobile project for selected UX specs.
- `vite.config.ts` only emits blog/devlog HTML pages explicitly registered under `build.rollupOptions.input`; any new devlog page must be added there.
- `blog/index.html` manually lists devlog entries; the new QA devlog should be added near the top.
- `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1` are real AB1 fixtures suitable for the required two-fixture QA path. `fixtures/large/3730.ab1` can be used as an optional performance/stretch fixture if time allows.
- `tests/e2e/qa-polish.e2e.test.ts` already exercises much of the v0-v15 matrix, including two AB1 fixtures, render/tooltip, zoom/pan, reverse complement, trim, search, edits, mixed bases, annotations, quality track, workspace tabs, and exports.
- `tests/e2e/touch.e2e.test.ts`, `tests/e2e/ux-a11y.e2e.test.ts`, `tests/e2e/front-door-polish.e2e.test.ts`, and `tests/e2e/ux-gallery.e2e.test.ts` provide existing patterns for touch, keyboard/focus, responsive, dark/light, and UX capture assertions.
- `src/components/QualityTrack.ts` already exposes a region, toggle state, data attributes, theme mutation observer, and resize observer, which are likely places to extend exact behavior assertions if QA finds quality-track friction.
- `src/components/TraceViewer.ts` wires the primary upload, canvas, controls, sequence panel, metadata, workspace, annotations, quality track, and exports; most end-to-end polish fixes will likely route through this component or its child components.

## Important existing coverage and gaps to reassess

The prior v15 devlog (`blog/2026-07-04-v15-qa-polish/index.html`) says the earlier QA pass found and fixed a search Prev/Next naming mismatch, and wrote follow-ups for keyboard/touch peak metadata. The current work unit should verify whether those follow-ups still remain, whether later features changed the workflow, and whether the quality track's light/dark, resize, and alignment behavior is sufficiently covered by tests.

Known areas that need fresh, explicit exercise during implementation:

1. **Live user path**: use Playwright MCP/browser against the actual app, not only Vitest or unit-level helpers.
2. **Two real AB1 fixtures**: load `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1` in one or more user-like sessions.
3. **Edit propagation**: edit one base, undo, redo, and verify exact propagation to sequence panel plus FASTA, FASTQ, QUAL, and SVG outputs.
4. **Quality track**: verify toggle state, x-alignment to peaks, resize reflow, and both light/dark palette behavior.
5. **Accessibility**: keyboard-only navigation, visible focus, ARIA names/states, screen-reader-relevant status text, and any canvas alternatives.
6. **Responsive/touch**: tablet and narrow mobile layouts, touch target sizes, pinch/pan/tap behavior, and no horizontal overflow.
7. **Devlog honesty**: list exact workflows performed, what passed, each defect found, each fix shipped, and follow-ups for issues deliberately left out of scope.

## Deliverable shape for the implementation PR

Expected new/changed files:

- `blog/2026-07-11-comprehensive-live-site-qa-polish/index.html` — human-voice QA findings devlog with evidence, defects, fixes, and scoped follow-ups.
- `blog/index.html` — link to the new devlog entry.
- `vite.config.ts` — register the new devlog page in `build.rollupOptions.input`.
- `tests/e2e/qa-polish.e2e.test.ts` and/or a focused new E2E spec — strengthen the comprehensive QA walkthrough with exact behavior assertions discovered during the pass.
- Focused `tests/core/*.test.ts` or component-level E2E specs — add regression coverage for each concrete polish fix.
- Focused source files under `src/components/`, `src/render/`, `src/export/`, `src/quality/`, `src/search/`, or `src/editing/` — only where real QA findings justify changes.
- `LEARNINGS.md`, `CHANGELOG.md`, or docs/history if a durable project learning or behavior change is discovered.

## Research conclusion

The implementation should start by running the current validation baseline, then perform a fresh Playwright MCP walkthrough before choosing fixes. Existing QA coverage is extensive, so the value of this PR will come from finding and proving current real friction, not from duplicating old canvas ink or happy-path checks. Every fix should be small, independently testable, and reflected in the devlog.
