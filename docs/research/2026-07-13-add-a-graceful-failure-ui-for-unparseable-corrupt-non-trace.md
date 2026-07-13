# Research: graceful failure for unparseable trace files

- **Date:** 2026-07-13
- **Owner:** sanger-viewer maintainers
- **Work unit:** ROBUSTNESS
- **Correlation marker:** `unit-id: 58a566e2-f52b-405c-8486-e1c948f3022e`

## Context

First-time users need a useful recovery path when a selected or dropped file is
empty, truncated, corrupt, or not an AB1/SCF trace. The change must remain
client-side, preserve the GitHub Pages base path, add no runtime dependency, and
must not overlap the separate measurement unit's README, `docs/measurement.md`,
metrics data, or workflow files.

## Findings

### Current load and failure path

- `src/components/TraceViewer.ts` owns both file-picker and drop handling.
  `load(file)` reads the file locally with `File.arrayBuffer()`, parses it in a
  Web Worker, and catches rejected parsing promises.
- `src/workers/parser.worker.ts` catches parser exceptions and returns only an
  error string to the UI. Worker-level errors also reject the promise in
  `parseInWorker`.
- `src/parsers/index.ts` selects AB1 or SCF from the first four bytes. Empty and
  truncated inputs can throw native `DataView` range errors; wrong-format input
  throws an unsupported-format error; structurally corrupt AB1/SCF input can
  fail deeper in `abif.ts` or `scf.ts`.
- The failure catch currently clears the displayed trace and calls
  `setState('error', parserMessage)`. This prevents many crashes, but the visible
  `#error-banner` is only a compact parser-message span. It does not consistently
  explain the problem, tell the scientist what to do next, or link to the
  bundled known-good trace.
- The existing error state also reuses the post-load compact header rather than
  presenting a dedicated recovery state.

### Existing UI and static sample

- `src/components/TraceViewer.ts` already has loading, success, and error state
  elements plus a “Try the sample” action in the empty state.
- `src/style.css` already defines light/dark error design tokens and basic
  `.status-banner--error` styling.
- `public/sample.ab1` is the bundled known-good trace.
- Vite uses `/` in development and `/sanger-viewer/` in production. Any sample
  link must derive from `import.meta.env.BASE_URL` rather than hard-code either
  path.

### Existing tests and CI

- `tests/e2e/ux-a11y.e2e.test.ts` has one synthetic four-byte invalid-file drop
  check. It only verifies that the existing banner is non-empty and that no
  `pageerror` occurred; it does not use persistent corrupt fixtures or assert
  recovery copy/actions.
- `tests/e2e/viewer.e2e.test.ts` demonstrates both `setInputFiles` and
  `DataTransfer` drop patterns.
- `playwright.config.ts` runs the general E2E suite on desktop Chrome and an iPad
  Chromium project. New general tests therefore need deterministic assertions
  in both projects.
- `.github/workflows/ci.yml` defines the required `test` job sequence:
  `npm ci`, lint, typecheck, Vitest, Chromium installation, Playwright E2E,
  performance smoke, and build.
- Test instructions require deterministic, independent tests with focused
  assertions. New test-specific gotchas belong in `LEARNINGS.md`.

## Recommended scope

Keep implementation changes confined to:

- `src/components/TraceViewer.ts`
- `src/style.css`
- `tests/e2e/graceful-failure.e2e.test.ts`
- `tests/fixtures/corrupt/empty.ab1`
- `tests/fixtures/corrupt/truncated.ab1`
- `tests/fixtures/corrupt/not-a-trace.txt`
- Playwright screenshot baselines generated for the new focused error-state
  assertion, if visual snapshots are used
- `LEARNINGS.md` only if implementation reveals a durable testing or error-state
  lesson not already recorded

No parser change is initially required: parser-specific details can remain
diagnostic while the viewer supplies stable plain-language cause and recovery
copy for every local-file failure.

## Assumptions and open notes

- The explicit request for these research and plan artifacts is treated as a
  planning-phase exception to “Do NOT touch docs/.” Product implementation will
  not alter docs, README, or workflows.
- “Link to a known-good sample trace” means a real anchor whose URL is derived
  from Vite's base path and points to `public/sample.ab1`; a separate action may
  also load the sample directly.
- “No uncaught console error” will cover both `pageerror` and console messages
  of type `error`, registered before each upload. Network noise must not be
  filtered merely to make the assertion pass.
- The three fixtures will represent distinct classes: zero-byte input,
  magic-header-only/truncated trace input, and ordinary non-trace text.
- The implementation branch should include the exact correlation marker in its
  name if branch management permits. The first commit must include
  `unit-id: 58a566e2-f52b-405c-8486-e1c948f3022e` as a trailer, and any later PR
  body must place that marker on its own line.

## References

- `src/components/TraceViewer.ts`
- `src/workers/parser.worker.ts`
- `src/parsers/index.ts`
- `src/parsers/abif.ts`
- `src/parsers/scf.ts`
- `src/style.css`
- `tests/e2e/ux-a11y.e2e.test.ts`
- `tests/e2e/viewer.e2e.test.ts`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `vite.config.ts`

