# Plan: graceful failure for unparseable trace files

- **Date:** 2026-07-13
- **Owner:** sanger-viewer maintainers
- **Work unit:** ROBUSTNESS
- **Correlation marker:** `unit-id: 58a566e2-f52b-405c-8486-e1c948f3022e`

## Goal and assumptions

Add an accessible, friendly, fully client-side recovery state for every local
file parse failure without changing the measurement unit's files or introducing
dependencies. The bundled `public/sample.ab1` is assumed to be the known-good
sample, and its link will use Vite's base URL so development and the
`/sanger-viewer/` GitHub Pages deployment both work.

These requested planning artifacts are an explicit exception to the work unit's
otherwise documentation-free implementation scope. No implementation changes
will be made until this plan is reviewed.

## File scope

Planned implementation files:

1. `src/components/TraceViewer.ts`
2. `src/style.css`
3. `tests/e2e/graceful-failure.e2e.test.ts`
4. `tests/fixtures/corrupt/empty.ab1`
5. `tests/fixtures/corrupt/truncated.ab1`
6. `tests/fixtures/corrupt/not-a-trace.txt`
7. New Playwright screenshot baselines for the focused error-state assertion,
   if visual snapshots are used
8. `LEARNINGS.md` only if the implementation produces a durable lesson

Explicitly excluded: `README.md`, all measurement documentation and metrics,
`.github/workflows/`, and unrelated parser, rendering, workspace, or test files.

## Implementation steps

1. **Establish the implementation baseline.**
   - Confirm the branch/correlation marker and working-tree scope.
   - Run the repository's complete CI-equivalent command sequence before edits
     and preserve verbatim output so pre-existing failures are distinguishable.

2. **Add three deterministic corrupt fixtures.**
   - Add a zero-byte `.ab1` file for the empty-file path.
   - Add an ABIF-header-only `.ab1` file for a recognized but truncated/corrupt
     trace path.
   - Add a plain-text non-trace file for the unsupported-format path.
   - Keep fixtures minimal, non-sensitive, and local to
     `tests/fixtures/corrupt/`.

3. **Replace the compact parser-message failure with a recovery state.**
   - Extend the existing error-state markup in `TraceViewer.ts` into a stable,
     accessible region with a plain-language heading, a non-technical cause,
     concrete guidance to choose an intact `.ab1` or `.scf` export, a retry
     file-picker action, and a real link to the known-good bundled sample.
   - Preserve a concise diagnostic detail without exposing it as the sole user
     explanation or injecting it as HTML.
   - Derive the sample URL from `import.meta.env.BASE_URL` to preserve GitHub
     Pages project-base support.
   - Reuse the same caught failure path for chosen and dropped files, hide the
     loading indicator, clear stale trace/workspace display state, keep controls
     safe, and allow immediate recovery by selecting another file.
   - Keep all trace bytes in the browser; add no network request except an
     explicit user navigation/load of the already bundled sample.

4. **Style the dedicated error state.**
   - Add focused responsive styles in `src/style.css` using existing error,
     surface, text, spacing, radius, and focus tokens.
   - Ensure recovery controls remain keyboard-visible, readable in light/dark
     modes, and usable at narrow/tablet widths.

5. **Add failure-focused Playwright coverage.**
   - In a new E2E spec, register `pageerror` and console-error collectors before
     each interaction.
   - Upload every file in `tests/fixtures/corrupt/` through `#file-input`; also
     exercise at least one fixture through the existing dropzone to prove both
     entry paths share graceful handling.
   - For each fixture, assert the loading state clears; the friendly error
     heading, cause, fix guidance, and sample anchor are visible; the sample URL
     respects the current base path; stale success/viewer output is absent; and
     retry remains available.
   - Assert no uncaught page error and no console message of type `error`.
   - Add a focused component screenshot assertion for each fixture, with stable
     masking/animation settings only if needed for deterministic output across
     the configured desktop and tablet projects.
   - Prove recovery by loading the known-good sample or a valid fixture after a
     failure and asserting a successful chromatogram render.

6. **Validate and review.**
   - Run the new Playwright spec first, then the full CI-equivalent sequence:
     `npm run lint`, `npm run typecheck`, `npm run test`,
     `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Scan every changed file for secrets.
   - Run code review and CodeQL validation, address valid findings, and rerun
     affected checks after any correction.
   - Record actual verbatim command output and verify every criterion below
     one-by-one before handoff. Do not skip, stub, weaken, or delete tests.

## Acceptance verification

1. **Malformed/corrupt/non-trace coverage:** enumerate the files under
   `tests/fixtures/corrupt/` and show at least three distinct fixtures.
2. **Clear cause:** each upload visibly states that the file could not be read as
   a Sanger trace, with a concise diagnostic detail.
3. **How to fix:** each upload visibly advises selecting an intact AB1/SCF export
   and exposes a retry file-picker action.
4. **Known-good sample:** each upload exposes a visible anchor to `sample.ab1`
   whose resolved URL is correct under the configured base path.
5. **No blank/stuck/crashed UI:** Playwright asserts the spinner is hidden, the
   error region is visible, recovery controls work, and a subsequent valid load
   renders the chromatogram.
6. **No uncaught browser errors:** Playwright asserts empty `pageerror` and
   console-error collections for every fixture.
7. **DOM/visual evidence:** focused DOM assertions and per-fixture error-state
   screenshot assertions prove the rendered recovery state.
8. **Client-side/privacy/static constraints:** inspect the diff for no upload,
   telemetry, backend, dependency, or hard-coded root-path additions.
9. **File-disjointness:** inspect the final diff to confirm no README,
   measurement, metrics, workflow, or unrelated files changed.
10. **Green CI-equivalent gate:** provide verbatim successful output for lint,
    typecheck, Vitest, full Playwright E2E, performance smoke, and build; then
    confirm the GitHub `test` job is green when available.

## Key risks and mitigations

- **Native parser text is inconsistent:** keep diagnostics secondary to stable,
  plain-language recovery copy.
- **Very short buffers throw native range errors:** rely on the existing worker
  and `load` catch boundary, and cover zero-byte and header-only files.
- **Stale sample/workspace content may confuse users:** explicitly verify failure
  clears stale rendered state and exposes only valid recovery actions.
- **Visual snapshots can vary by project:** scope screenshots to the error region,
  disable animations, and maintain project-specific baselines rather than
  weakening assertions.
- **Sample links can break on GitHub Pages:** derive the URL from Vite's base and
  assert the resolved link.
- **Console assertions can become timing-sensitive:** attach listeners before
  navigation/upload and wait for the terminal error state before checking.
- **Parallel-unit merge conflicts:** enforce the explicit file list and leave
  README, measurement docs/data, and workflows untouched.

## Open notes

- If stable visual snapshots prove platform-dependent despite component scoping,
  retain the required per-fixture DOM assertions and attach deterministic
  screenshots as Playwright artifacts, documenting the reason rather than
  weakening failure behavior checks.
- `LEARNINGS.md` should only change if implementation reveals a durable lesson;
  no speculative entry is planned.

