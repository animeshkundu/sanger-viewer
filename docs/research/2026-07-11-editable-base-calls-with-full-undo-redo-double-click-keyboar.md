# Editable base calls with full undo/redo — research

Date: 2026-07-11  
Owner: @animeshkundu / Copilot task agent  
Controller marker: `unit-id: 67eb9549-e547-4af2-8305-caf8405471d4`

## Context

The requested work unit is Unit A of a two-feature chain: in-place editable base calls with full undo/redo, propagation to all derived views/exports, keyboard/accessibility/theme support, exact unit tests, Playwright coverage, and a registered devlog entry. Unit B (FASTQ/QUAL export plus quality track) depends on Unit A, so Unit A must not block edited sequences or edited qualities from flowing into FASTQ/QUAL and the future quality track.

## Repository state found

This repository already contains a substantial editable-base and FASTQ/QUAL implementation, despite the problem statement describing the task as upcoming on top of v0–v12:

- `src/editing/BaseEditModel.ts` defines a pure edit model with active edits, undo/redo snapshots, edited-index reporting, base-call application, quality sentinel substitution, serialization, replace, and reset.
- `src/components/TraceViewer.ts` already imports `BaseEditModel`, maps display indices to forward indices, applies edits before reverse-complement and mixed-base calling, re-pins edited bases after `callMixedBases()`, and routes exports through the current displayed trace.
- `src/components/SequencePanel.ts` renders per-base spans with `data-base-index`, `role="button"`, roving tab index, edited highlighting, active editing styling, and edited ARIA labels.
- `src/components/Controls.ts` already includes visible Undo/Redo buttons with shortcut labels and disabled-state synchronization.
- `src/export/fastq.ts` implements `toFastq()` and `toQual()` with exact Phred+33 encoding, trimming support, reverse-complement naming, and null-quality handling.
- `src/components/QualityTrack.ts` and `src/quality/qualityBars.ts` already implement a toggleable per-base quality track and exact bar geometry model.
- Existing tests include `tests/core/editModel.test.ts`, `tests/core/fastq-export.test.ts`, `tests/core/qualityBars.test.ts`, and `tests/e2e/edit-base.e2e.test.ts`.
- Existing devlogs include `blog/2026-07-03-v13-editable-bases/index.html` and `blog/2026-07-03-v14-quality-track/index.html`, both registered in `vite.config.ts`.

## Important implementation details to preserve

- Edits are stored in forward-strand coordinates. Reverse-complement display edits must convert display index to forward index and complement the typed IUPAC base before storing.
- Edits must be applied before reverse-complement, trimming, search, alignment/variant calling, ORF/restriction annotations, and export derivation so all downstream features share one working sequence.
- After mixed-base calling, manual edits must be re-pinned because signal-derived mixed-base calls can overwrite edited positions.
- Edited positions currently use quality score `0`, which FASTQ encodes as `!`.
- Focus preservation depends on mutating the existing sequence span for edit-mode highlighting and then refocusing the same `data-base-index` span after render.
- Vite only publishes blog/devlog pages explicitly registered in `build.rollupOptions.input`.

## Main risks

1. **Workspace persistence gap:** `TraceWorkspace.TraceSlot` currently does not store edit entries, and `saveCurrentSlot()` does not persist `editModel.toArray()`. Switching traces may drop edits unless hardened.
2. **Undo/redo stack scope:** Persisted permalink edits restore active edits but intentionally clear undo/redo history through `editModel.replace()`. This is acceptable for shared links but should be documented and tested if behavior is user-visible.
3. **Derived-feature propagation:** Search and exports are covered directly, but translation/ORF/restriction/primer/reference consumers need explicit regression assertions or targeted manual verification because they derive from `renderer.getCurrentTrace()` / `mixedBaseResult.sequence`.
4. **Keyboard overlap:** Sequence spans currently use Enter/Space for the base inspector while double-click enters edit mode. Acceptance only requires double-click plus keyboard typing/delete, but keyboard-accessible edit entry may need a discoverable path if review interprets keyboard accessibility as keyboard-only edit activation.
5. **E2E stability:** Existing E2E uses the first visible base and download events. It should be strengthened with exact fixture expectations so failures identify propagation bugs rather than only generic validity.
6. **Scope collision with Unit B:** FASTQ/QUAL and quality track are already present. Unit A should avoid reshaping Unit B behavior except where edited bases require FASTQ propagation.

## Candidate files for implementation PR

- `src/editing/BaseEditModel.ts`
- `src/components/TraceViewer.ts`
- `src/components/SequencePanel.ts`
- `src/components/Controls.ts`
- `src/export/fasta.ts`
- `src/export/fastq.ts`
- `src/style.css`
- `src/workspace/TraceWorkspace.ts`
- `src/workspace/permalink.ts` only if edit-state validation needs tightening
- `tests/core/editModel.test.ts`
- `tests/core/fastq-export.test.ts`
- `tests/core/findSubsequence.test.ts` or a new focused integration test for edited-sequence propagation
- `tests/core/mixedBase.test.ts`
- `tests/e2e/edit-base.e2e.test.ts`
- `blog/index.html`
- a new `blog/2026-07-11-.../index.html` entry
- `vite.config.ts`
- `LEARNINGS.md` if a durable implementation gotcha is confirmed

## Validation commands

Run the existing gates with actual output in the implementation PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

If time is tight during iteration, run focused tests first, then the full gate before handoff:

```bash
npm run test -- tests/core/editModel.test.ts tests/core/fastq-export.test.ts tests/core/mixedBase.test.ts
npm run test:e2e -- tests/e2e/edit-base.e2e.test.ts
```

## Related durable references

- Existing editable-base devlog: `blog/2026-07-03-v13-editable-bases/index.html`
- Existing quality-track devlog: `blog/2026-07-03-v14-quality-track/index.html`
- Existing edit model tests: `tests/core/editModel.test.ts`
- Existing E2E: `tests/e2e/edit-base.e2e.test.ts`
- Existing Vite input registry: `vite.config.ts`
