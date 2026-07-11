# Editable base calls with full undo/redo — research

Controller marker: `unit-id: 67eb9549-e547-4af2-8305-caf8405471d4`

## Scope

This research is strictly scoped to Unit A: in-place editable base calls with full undo/redo, propagation into derived sequence features, FASTA/FASTQ export consistency, accessibility, light/dark rendering, genuine unit tests, and one Playwright E2E proving an edit reaches FASTQ.

Unit B quality-track and QUAL-export work is out of scope except where existing FASTQ/QUAL code informs how Unit A edited bases should propagate.

## Current implementation map

### Edit model

- `src/editing/BaseEditModel.ts` already defines a pure `BaseEditModel` keyed by forward-strand base index.
- It stores active edits in a `Map<number, EditEntry>`, with full-snapshot undo and redo stacks.
- `apply()` uppercases bases, treats applying the original base as a revert, skips no-op edits, clears redo on new edits, and exposes `canUndo` / `canRedo`.
- `applyToBaseCalls()` returns edited base calls.
- `applyToQualities()` replaces qualities at edited indices with `EDITED_BASE_QUALITY_SENTINEL = 0`, which FASTQ encodes as `!`.
- `toArray()`, `replace()`, and `reset()` support permalink/workspace persistence and trace reload cleanup.

### Sequence panel rendering

- `src/components/SequencePanel.ts` renders base calls as `span[data-base-index]`.
- Existing render options include `editedIndices` and `editingIndex`.
- Edited spans get `.edited-base`, `data-edited="true"`, and `(edited)` in their `aria-label`.
- The selected or fallback first visible base gets `tabIndex=0`, and spans are exposed as `role="button"`.
- The renderer patches spans in place when the visible window is unchanged, which helps preserve focus and avoid unnecessary DOM churn.

### TraceViewer integration

- `src/components/TraceViewer.ts` owns the live `BaseEditModel`.
- `buildDisplayTrace()` applies edits to `rawTrace.baseCalls` and `rawTrace.qualities` before reverse-complement rendering, mixed-base calling, trimming, search UI sync, annotation/ORF feature derivation, restriction-site derivation, and export.
- After `callMixedBases()`, manually edited positions are re-pinned so signal-based ambiguity calling cannot overwrite explicit user edits.
- Display indices are mapped to forward-strand indices by `displayToForwardIndex()`.
- Reverse-complement edits are stored as the IUPAC complement of the display base, so the forward model remains canonical.
- Double-clicking a sequence span sets `editingIndex`, adds the `.editing` class without a full re-render, and focuses the span.
- Typing an IUPAC base while that span is in edit mode applies the edit and refocuses the refreshed span.
- Delete/Backspace reverts the focused position to the original raw-trace base.
- Escape exits edit mode.
- Toolbar Undo/Redo actions and global Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, and Ctrl/⌘+Y shortcuts call the edit model, update toolbar disabled states, and re-render the display trace.

### Propagation surfaces

- Search: `applySearchQuery()` calls `findSubsequenceMatches(rawTrace.sequence, normalizedQuery)`. Because the current code keeps raw search state canonical but edits are rendered through `buildDisplayTrace()`, this path needs careful verification; acceptance requires search to observe the working edited sequence, not stale original raw sequence.
- Reverse complement: edits are applied before `reverseComplementTrace()`, and display-to-forward mapping plus `iupacComplement()` supports editing while the reverse strand is shown.
- ORF/translation-equivalent annotations: `buildAnnotationFeatures(mixedBaseResult.sequence)` receives the edited display sequence. ORF detection lives in `src/annotations/orfs.ts`.
- FASTA: export actions pass `renderer.getCurrentTrace()` into `toFasta()`, so FASTA should reflect the edited display trace.
- FASTQ: export actions pass `renderer.getCurrentTrace()` into `toFastq()`, and edited positions should carry quality 0 from `BaseEditModel.applyToQualities()`.
- SVG/print and other exports already use the current display trace or visible sequence and should remain consistent, but Unit A verification should focus on required FASTA and FASTQ.

### Styling and accessibility

- `src/style.css` defines light theme edited-base tokens around lines 81–83 and dark theme edited-base tokens around lines 243–245.
- `.edited-base` and `.sequence-panel span.editing` styles use those tokens.
- Sequence spans have focus ring styles and ARIA labels, and undo/redo buttons expose explicit shortcut labels in `src/components/Controls.ts`.
- Toolbar disabled states are controlled by `setUndoRedoState()`.

### Existing tests

- `tests/core/editModel.test.ts` already contains exact assertions for substitution, no-ops, undo/redo states, quality sentinel behavior, and reset.
- `tests/core/fastq-export.test.ts` already asserts exact FASTQ records and Phred+33 bytes for known traces.
- `tests/e2e/edit-base.e2e.test.ts` already exercises double-click edit, FASTQ export, toolbar undo/redo, keyboard shortcuts, disabled buttons, and basic a11y attributes.

## Gaps and risks to address in implementation

1. **Search propagation risk:** `applySearchQuery()` currently reads `rawTrace.sequence`; if `rawTrace.sequence` is not rewritten after edits, find/search can miss edited bases. The implementation should make search use the working/display sequence for matching while preserving correct canonical/display coordinate mapping.
2. **Derived feature refresh risk:** ORF/annotation refresh happens in `buildDisplayTrace()`, but implementation tests should verify a sequence-changing edit triggers downstream recomputation rather than relying on incidental UI refresh.
3. **Focus preservation risk:** applying, undoing, redoing, and reverting can re-render the visible sequence window. The focused base at the same display index must remain focusable and regain focus after the transition.
4. **Reverse-complement edit risk:** editing in reverse-complement view must store the complemented forward base and keep exports/search consistent in the visible strand.
5. **Undo/redo stack edge cases:** no-op edits and applying the original base must not create bogus stack transitions; new edits after undo must clear redo.
6. **Dark/light contrast risk:** the edited and editing highlights need visible contrast in both theme modes and must not hide search/selection state.
7. **E2E determinism risk:** the test should target a stable visible base from a fixture, pick a replacement that differs from the original, and assert exact FASTQ line content at the edited position rather than just checking that a download happened.

## Files likely changed by Unit A

- `src/editing/BaseEditModel.ts`
- `src/components/TraceViewer.ts`
- `src/components/SequencePanel.ts`
- `src/components/Controls.ts`
- `src/style.css`
- `tests/core/editModel.test.ts`
- `tests/core/findSubsequence.test.ts` or a new focused core test for edited search propagation
- `tests/core/fastq-export.test.ts`
- `tests/e2e/edit-base.e2e.test.ts`
- `blog/2026-07-11-editable-base-calls-undo-redo/index.html`
- `blog/index.html`
- `vite.config.ts`
- `CHANGELOG.md` and/or `LEARNINGS.md` if implementation uncovers a durable repo learning

## Verification commands

Before final handoff for implementation, run and paste verbatim output:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

For a faster inner loop while implementing, run targeted tests first:

- `npm run test -- tests/core/editModel.test.ts tests/core/fastq-export.test.ts tests/core/findSubsequence.test.ts`
- `npm run test:e2e -- tests/e2e/edit-base.e2e.test.ts`

