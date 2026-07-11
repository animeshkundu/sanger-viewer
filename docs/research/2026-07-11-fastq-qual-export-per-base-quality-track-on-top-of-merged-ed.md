# 2026-07-11 — FASTQ/QUAL export + per-base quality track on editable base calls

- Owner: Copilot task agent
- Repository: `animeshkundu/sanger-viewer`
- Unit marker: `4c79d0aa-35be-4246-85e1-354ea10546f8`
- Context: planning pass only; no implementation code changes in this artifact.

## Problem context

This work unit asks for one small PR that combines FASTQ/QUAL export of the current working sequence with a toggleable per-base PHRED quality bar track under the chromatogram. It must build on the merged editable-base-calls feature, including its documented edited-position quality sentinel, and it must add genuine exact-value unit and E2E coverage plus a human-voice devlog entry published by Vite.

## Current repository findings

Several pieces already exist and should be reused rather than rewritten:

- `src/editing/BaseEditModel.ts` defines `EDITED_BASE_QUALITY_SENTINEL = 0` and `applyToQualities()`, which substitutes the sentinel at edited forward-strand indices.
- `src/components/TraceViewer.ts` applies edits in `buildDisplayTrace()` before reverse complement and mixed-base calling, then re-pins edited bases after mixed-base calling so the displayed trace, exports, and quality track can share one working trace.
- `src/export/fastq.ts` already contains `toFastq()` and `toQual()` helpers with PHRED+33 encoding, trim-aware slicing, all-trimmed handling, and QUAL wrapping.
- `src/components/Controls.ts` already exposes `Export FASTQ` and `Export QUAL` menu items.
- `src/components/TraceViewer.ts` already wires `export-fastq` and `export-qual` actions through `renderer.getCurrentTrace()`, which should be the edited/strand-adjusted working trace.
- `src/quality/qualityBars.ts` provides exact layout data: score, x-coordinate, bar height, tier, and CSS variable for each visible base.
- `src/components/QualityTrack.ts` creates an accessible `section` with `role="region"`, `aria-label="Per-base quality track"`, a toggle with `aria-pressed`, and a canvas with `data-testid="quality-track-canvas"`.
- `src/style.css` defines light and dark `--color-qual-*` tokens and `.quality-track*` layout styles.
- `tests/core/fastq-export.test.ts`, `tests/core/qualityBars.test.ts`, `tests/e2e/edit-base.e2e.test.ts`, and `tests/e2e/quality-track.e2e.test.ts` already cover many requested behaviors.
- `blog/2026-07-03-v13-editable-bases/index.html` and `blog/2026-07-03-v14-quality-track/index.html` are useful references for existing devlog tone and claims.
- `vite.config.ts` only publishes devlog entries that are explicitly listed in `build.rollupOptions.input`.

## Likely gaps to close in implementation

Because prior slices already landed much of the requested feature, the implementation task should first run the current suite and compare it against the acceptance criteria. The most likely remaining gaps are:

1. Strengthen FASTQ/QUAL tests so at least one test asserts the entire FASTQ record string as exact bytes for a known input, including length equality, instead of only checking individual lines in separate assertions.
2. Add or strengthen an exact test proving edited bases flow to both FASTQ and QUAL using the sentinel value, ideally through `BaseEditModel` plus `toFastq()`/`toQual()` together rather than only the pure edit model.
3. Confirm the all-trimmed case is exact for both FASTQ and QUAL; current coverage appears present but should be preserved and, if needed, clarified.
4. Confirm the quality-track E2E assertion remains non-vacuous by sampling actual columns and comparing observed bar heights to PHRED-derived expectations.
5. Add the new human-voice devlog entry for this PR, add it to `blog/index.html`, and register it in `vite.config.ts` `build.rollupOptions.input`.
6. Consider updating `LEARNINGS.md` if implementation discovers a durable gotcha beyond facts already documented in this research.

## Key risks

- Export source-of-truth drift: FASTA/FASTQ/QUAL must use the same edited, strand-aware, trim-aware working trace shown in the UI.
- Reverse-complement edited quality alignment: the sentinel is applied on forward indices before reverse complement, then qualities are reversed by `reverseComplementTrace()`.
- Mixed-base overwrite: `callMixedBases()` can overwrite edited calls, so the existing re-pin block must remain intact.
- Canvas tests can become vacuous if they only assert ink exists; the quality-track test must assert exact bar heights/positions derived from scores.
- Devlog publication can silently fail if the new HTML file is not included in `vite.config.ts`.
- E2E selectors must continue targeting `[data-testid="chromatogram-canvas"]` explicitly because the page also has the quality-track canvas.

## Verification commands for the implementation PR

Run and paste verbatim output for:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

If the implementation changes performance-sensitive rendering code, also run:

```sh
npm run perf:smoke
```

## Related files

- `src/editing/BaseEditModel.ts`
- `src/export/fastq.ts`
- `src/components/TraceViewer.ts`
- `src/components/Controls.ts`
- `src/components/QualityTrack.ts`
- `src/quality/qualityBars.ts`
- `src/style.css`
- `tests/core/fastq-export.test.ts`
- `tests/core/qualityBars.test.ts`
- `tests/e2e/edit-base.e2e.test.ts`
- `tests/e2e/quality-track.e2e.test.ts`
- `blog/index.html`
- `vite.config.ts`
- `LEARNINGS.md`
