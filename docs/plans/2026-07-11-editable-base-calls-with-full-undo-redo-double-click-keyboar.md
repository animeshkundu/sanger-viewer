# Editable base calls with full undo/redo — implementation plan

Controller marker: `unit-id: 67eb9549-e547-4af2-8305-caf8405471d4`

## Goal

Deliver Unit A only: double-click + keyboard editing of called bases, full undo/redo, propagation into derived sequence features and FASTA/FASTQ exports, visible/revertible edited-base state, keyboard accessibility, light/dark polish, exact unit tests, and a Playwright E2E that proves an edited base reaches FASTQ.

## Step-by-step plan

1. **Confirm the current behavior baseline**
   - Run the existing focused edit/export tests to see which Unit A pieces already pass.
   - Inspect failures before changing code; do not delete, skip, or weaken any existing test.

2. **Harden the pure edit model**
   - Keep `BaseEditModel` as the single source of truth for manual edits.
   - Ensure edits are keyed by forward-strand indices and normalized to uppercase IUPAC bases.
   - Ensure applying the original raw base removes the active edit and creates a valid undoable transition only when state actually changes.
   - Ensure no-op edits do not push undo stack entries.
   - Ensure undo and redo restore every prior state exactly, including edited indices and edited quality sentinel state.

3. **Wire editing input in the sequence panel**
   - Use sequence spans as the edit targets via `data-base-index`.
   - On double-click, enter edit mode for that span, preserve focus, add an editing highlight, and expose the state through existing ARIA labels/classes.
   - Accept typed IUPAC bases `A C G T N R Y S W K M B V D H` only while that span is in edit mode.
   - Treat Delete/Backspace on a focused span as revert-to-original.
   - Treat Escape as cancel/exit edit mode without mutation.
   - Keep Enter/Space behavior compatible with the existing keyboard base inspector unless implementation review decides a separate keyboard edit affordance is needed.

4. **Preserve canonical coordinate handling**
   - Convert display index to forward index before writing to the edit model.
   - In reverse-complement view, store the IUPAC-complemented base in the forward edit model.
   - Map edited forward indices back to display indices for highlights.
   - Verify edits still appear at the expected display position after strand toggles.

5. **Propagate edits through every required derived surface**
   - Apply edits to base calls and qualities before constructing the current display trace.
   - Re-pin manually edited bases after mixed-base calling so signal-derived ambiguity calls do not overwrite explicit edits.
   - Ensure find/search matches the working edited sequence, not stale raw sequence.
   - Ensure reverse-complement view uses the edited working sequence.
   - Ensure ORF/translation-derived annotations are rebuilt from the edited display sequence.
   - Ensure FASTA export uses the edited display trace.
   - Ensure FASTQ export uses the edited display trace and emits `!` at edited positions through quality score 0.

6. **Implement full undo/redo UI and shortcuts**
   - Keep visible Undo and Redo toolbar buttons in the Edit control group.
   - Update disabled states after every edit, revert, undo, redo, trace load, trace clear, and permalink restore.
   - Support Ctrl/⌘+Z for undo.
   - Support Ctrl/⌘+Shift+Z and Ctrl/⌘+Y for redo.
   - Do not intercept shortcuts while focus is in text inputs or textareas.
   - After undo/redo, refresh the display trace and keep focus as close as possible to the edited base.

7. **Make edited bases visually distinct and revertible**
   - Use `.edited-base` for committed edits and `.editing` for the active edit target.
   - Confirm colors use theme tokens and remain visible in both light and dark modes.
   - Ensure Delete/Backspace reverts edited spans to original base calls and removes `.edited-base`.
   - Ensure applying the original base by typing it also clears the edit.

8. **Strengthen accessibility**
   - Keep sequence spans keyboard-focusable through roving tabindex.
   - Preserve focus after edit/revert/undo/redo where the span remains visible.
   - Ensure edited spans include `(edited)` in their accessible label.
   - Ensure undo/redo buttons have descriptive ARIA labels and disabled states.
   - Ensure no edit workflow requires a pointer-only path: focused spans plus keyboard controls must support inspection, revert, and global undo/redo.

9. **Add or strengthen Vitest coverage with exact assertions**
   - In `tests/core/editModel.test.ts`, assert exact base arrays and exact `editedIndices` after every transition:
     - initial state;
     - first edit;
     - second edit;
     - undo once;
     - undo to empty;
     - redo once;
     - redo to latest;
     - new edit after undo clears redo;
     - revert-to-original transition;
     - quality sentinel appears and disappears through undo/redo.
   - Add a focused exact-value test for edited-sequence search propagation if production code needs a helper or adjustment.
   - Add/keep exact FASTQ assertion proving an edited trace sequence and quality array produce expected FASTQ bytes.

10. **Add or strengthen Playwright E2E coverage**
    - Use a deterministic fixture such as `fixtures/ab1/310.ab1`.
    - Load the trace, locate a visible sequence-panel span, double-click it, and type a replacement base that differs from the original.
    - Assert the span text changes to the exact new base.
    - Assert the span has `.edited-base`.
    - Download FASTQ through the export menu.
    - Assert the FASTQ sequence line contains the new base at the edited index.
    - Assert the FASTQ quality line has `!` at the edited index.
    - Include toolbar/keyboard undo-redo disabled-state assertions if current coverage is incomplete.

11. **Update devlog and publication wiring**
    - Add a human-voice devlog entry for this Unit A work.
    - Add the entry to `blog/index.html`.
    - Register the devlog HTML page in `vite.config.ts` `build.rollupOptions.input` so it is emitted to GitHub Pages.
    - Keep the entry focused on editable base calls with undo/redo; do not include unrelated feature material.

12. **Final validation and handoff**
    - Run `npm run lint`.
    - Run `npm run typecheck`.
    - Run `npm run test`.
    - Run `npm run test:e2e`.
    - Run `npm run build`.
    - Paste actual verbatim command output in the implementation handoff.
    - Run secret scanning on changed files before committing.
    - Run parallel validation after committed code changes.
    - Verify every Unit A acceptance criterion one by one in the final handoff.

## Acceptance criterion verification matrix

| Criterion | Verification |
| --- | --- |
| Double-click editing | Playwright double-clicks a sequence span and types a replacement base; assertion checks exact span text. |
| Keyboard base input accepts IUPAC/ACGTN | Unit tests cover model normalization; E2E uses a valid typed base; implementation should reject non-IUPAC keys without mutation. |
| Delete/Backspace revert | Unit/model test for revert-to-original plus E2E or focused DOM test for focused-span revert. |
| Working sequence propagation to find/search | Exact test searches for a motif introduced by an edit and verifies the match appears at the edited coordinate. |
| Reverse-complement propagation | Unit or E2E verifies editing in one strand appears correctly after strand toggle and/or export uses the visible edited strand. |
| Translation/ORF propagation | Exact unit-level or UI-level test verifies an edit that creates/removes an ORF changes derived ORF features. |
| FASTA export propagation | Exact export assertion checks FASTA sequence includes the edited base. |
| FASTQ export propagation | Playwright downloads FASTQ and checks exact sequence and `!` quality at edited index. |
| Undo/redo stack | Vitest exact assertions for every state transition; toolbar and keyboard E2E assertions for user-visible behavior. |
| Toolbar disabled states | E2E checks Undo disabled initially, enabled after edit, disabled after undo; Redo inverse states. |
| Visual highlight | E2E asserts `.edited-base`; CSS review verifies light/dark tokens. |
| Revertible edited bases | Unit and/or E2E verifies typed original or Delete/Backspace removes edit and highlight. |
| Keyboard accessibility | E2E/assertions for focusable spans, ARIA labels, focus preservation, and shortcut behavior. |
| Light and dark themes | CSS tokens plus UX/a11y E2E or screenshot coverage in both themes if existing harness supports it. |
| Genuine Vitest tests | Exact arrays, exact booleans, exact FASTQ bytes; no pixel-only/vacuous assertions. |
| Devlog published | New blog file is linked from `blog/index.html` and registered in `vite.config.ts`. |
| CI green | Full lint/typecheck/unit/E2E/build command output pasted in handoff. |

## Key risks

- Search currently appears to use `rawTrace.sequence`; if unchanged, edited bases may not be searchable.
- Workspace slots currently persist raw traces and many per-slot states; edit state persistence between slot switches needs explicit verification.
- Focus can be lost if a re-render replaces the active span; refocus must happen after trace refresh.
- Reverse-complement edits can be off by one or incorrectly complemented if display/forward mapping is inconsistent.
- Mixed-base calling can overwrite edited base calls unless the existing re-pin step remains intact.
- Dark theme highlights can lose contrast when combined with selected/search classes.

## Out of scope

- Unit B quality-track implementation.
- New BLAST, permalink, clinical-annotation, in-silico PCR, or other unrelated feature work.
- Force-pushes, branch deletion, skipped tests, stubs, or scope reductions.

