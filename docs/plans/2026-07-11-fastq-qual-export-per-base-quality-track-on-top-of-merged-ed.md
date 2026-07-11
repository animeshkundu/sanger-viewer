# 2026-07-11 — Implementation plan: FASTQ/QUAL export + per-base quality track

- Owner: Copilot task agent
- Repository: `animeshkundu/sanger-viewer`
- Unit marker: `4c79d0aa-35be-4246-85e1-354ea10546f8`
- Scope: one small implementation PR after this planning pass.

## Acceptance criteria mapping

1. Export the possibly edited working sequence with PHRED qualities as FASTQ and QUAL.
2. Edited bases propagate into exports with the documented sentinel quality.
3. Render a per-base quality bar track aligned under the trace.
4. The quality track is color-graded by score, toggleable, accessible, and correct in light and dark themes.
5. Tests assert exact FASTQ record bytes, exact QUAL integer values, and all-trimmed empty-body behavior.
6. Quality-track render tests assert score-to-position/height mapping, not just canvas ink.
7. Add a human-voice devlog entry and register it in `vite.config.ts`.
8. Run full validation: lint, typecheck, unit tests, E2E, build.

## Step-by-step plan

### 1. Baseline and gap check

- Run `npm ci` only if dependencies are missing or stale.
- Run the current relevant subset first to identify existing failures:
  - `npm run test -- tests/core/fastq-export.test.ts tests/core/qualityBars.test.ts`
  - `npm run test:e2e -- tests/e2e/edit-base.e2e.test.ts tests/e2e/quality-track.e2e.test.ts`
- Do not fix unrelated pre-existing failures unless they block the acceptance criteria.

### 2. Export model and helpers

- Keep `src/export/fastq.ts` as the pure export module.
- Ensure `toFastq()`:
  - writes a four-line record with `@id`, sequence, `+`, PHRED+33 quality line, and trailing newline;
  - clamps PHRED values to printable FASTQ range;
  - pads missing qualities as score 0;
  - slices qualities to the same trimmed window as the sequence;
  - emits empty sequence and quality lines for all-trimmed mode.
- Ensure `toQual()`:
  - writes `>id` header;
  - outputs integer PHRED values aligned to exported bases;
  - wraps long output without changing values;
  - emits header only for all-trimmed mode.
- If any drift is found, update the smallest part of `src/export/fastq.ts`.

### 3. Edited-base propagation

- Preserve `EDITED_BASE_QUALITY_SENTINEL = 0` in `src/editing/BaseEditModel.ts`.
- Preserve the `buildDisplayTrace()` order in `src/components/TraceViewer.ts`:
  - apply edits to raw base calls and qualities first;
  - reverse-complement after edits when needed;
  - run mixed-base calling;
  - re-pin manually edited display indices after mixed-base calling.
- Ensure FASTQ and QUAL export actions use `renderer.getCurrentTrace()` rather than `rawTrace`.
- Add or strengthen a unit test that applies a base edit, exports both FASTQ and QUAL, and asserts the exact edited base plus sentinel quality output.

### 4. Quality track rendering and UX

- Keep the quality track under the chromatogram in `src/components/TraceViewer.ts`.
- Keep `src/quality/qualityBars.ts` as the pure layout calculation:
  - x-coordinate from peak position, viewport start, and samples-per-pixel;
  - height from PHRED score capped at Q40;
  - score tiers mapped to CSS variables.
- Keep `src/components/QualityTrack.ts` responsible for:
  - accessible region label;
  - toggle button state and text;
  - repaint on resize and theme changes;
  - trim-window filtering in trimmed mode.
- Review `src/style.css` light/dark `--color-qual-*` values and `.quality-track*` styles for contrast and visual polish; adjust only if needed.

### 5. Tests

- Update `tests/core/fastq-export.test.ts` to include exact whole-record assertions:
  - known FASTQ bytes with exact `@header`, sequence, `+`, PHRED+33 line, and trailing newline;
  - quality line length equals sequence line length;
  - exact QUAL integer values;
  - edited-position sentinel in both FASTQ and QUAL;
  - all-trimmed FASTQ and QUAL outputs.
- Update `tests/core/qualityBars.test.ts` only if the layout contract changes; keep exact array assertions for base index, score, x, height, tier, and CSS variable.
- Keep or strengthen `tests/e2e/quality-track.e2e.test.ts` so it samples expected x columns and asserts actual rendered bar heights equal PHRED-derived heights.
- Keep or strengthen `tests/e2e/edit-base.e2e.test.ts` for exported edited FASTQ; add a QUAL download assertion if unit coverage is not enough for the UI path.
- Do not add skipped tests, broad snapshots, or canvas ink-sum thresholds.

### 6. Devlog and durable docs

- Add a new human-voice devlog entry under `blog/2026-07-11-fastq-qual-quality-track/`.
- Add the entry near the top of `blog/index.html`.
- Register the entry in `vite.config.ts` under `build.rollupOptions.input`.
- Update `LEARNINGS.md` only if a durable gotcha is discovered during implementation.

### 7. Validation and review gates

- Run and paste verbatim output:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`
  - `npm run build`
- Run secret scanning on all changed files before committing.
- Run parallel validation before final handoff.
- Address high-confidence Copilot/code review and CodeQL findings.
- Include `4c79d0aa-35be-4246-85e1-354ea10546f8` on its own line in the PR body.
- Use a first implementation commit with a trailer line:
  - `unit-id: 4c79d0aa-35be-4246-85e1-354ea10546f8`

## Files expected to change

- `src/export/fastq.ts` if export edge-case logic needs adjustment.
- `src/components/TraceViewer.ts` if export wiring or quality-track refresh needs adjustment.
- `src/components/QualityTrack.ts` if accessibility, toggle behavior, or repaint behavior needs adjustment.
- `src/quality/qualityBars.ts` if score-to-bar mapping needs adjustment.
- `src/style.css` if light/dark quality-track polish needs adjustment.
- `tests/core/fastq-export.test.ts`
- `tests/core/qualityBars.test.ts`
- `tests/e2e/edit-base.e2e.test.ts`
- `tests/e2e/quality-track.e2e.test.ts`
- `blog/2026-07-11-fastq-qual-quality-track/index.html`
- `blog/index.html`
- `vite.config.ts`
- `LEARNINGS.md` only if implementation uncovers durable knowledge.

## Risks and mitigations

- Risk: edited qualities and edited bases can diverge. Mitigation: assert both exported sequence and quality sentinel at the same position.
- Risk: reverse-complement quality order can be wrong. Mitigation: preserve apply-edits-before-revcomp flow and add exact reverse-complement tests if changes touch that path.
- Risk: trimmed/all-trimmed outputs can produce mismatched sequence and quality lengths. Mitigation: exact record tests for trimmed and all-trimmed modes.
- Risk: quality-track E2E can become flaky due to device-pixel-ratio rounding. Mitigation: compare PHRED-derived CSS-pixel heights using the existing DPR-aware sampling pattern.
- Risk: devlog exists locally but is not published. Mitigation: verify `vite.config.ts` and `blog/index.html` updates, then run build.

## Stop/go notes

- Stop and report a blocker if the current branch is not based on the merged editable-base-calls changes.
- Stop and report a blocker rather than weakening assertions if exact FASTQ/QUAL outputs disagree with the documented sentinel contract.
- Keep the PR focused; do not redesign unrelated workspace, alignment, or parser behavior.
