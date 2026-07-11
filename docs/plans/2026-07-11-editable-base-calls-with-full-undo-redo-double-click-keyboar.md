# Editable base calls with full undo/redo — implementation plan

Date: 2026-07-11  
Owner: @animeshkundu / Copilot task agent  
Controller marker: `unit-id: 67eb9549-e547-4af2-8305-caf8405471d4`

## Scope

Deliver Unit A: editable base calls with full undo/redo, double-click + keyboard editing, propagation to derived sequence features and exports, accessible/themed UI states, exact unit tests, Playwright E2E coverage, and a registered human-voice devlog. Do not implement new Unit B surface area beyond preserving edited-sequence flow into existing FASTQ/QUAL/quality-track code paths.

## Step-by-step plan

1. **Confirm baseline and branch hygiene**
   - Confirm the working branch name includes `67eb9549-e547-4af2-8305-caf8405471d4` if branch control is available.
   - Run the pre-change baseline gates required by the repository: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build`.
   - Record any pre-existing failures verbatim before changing implementation files.

2. **Audit existing edit model behavior**
   - Review `src/editing/BaseEditModel.ts` for exact undo/redo transitions, no-op behavior, redo clearing, reset, serialization, and quality sentinel behavior.
   - Add or strengthen tests in `tests/core/editModel.test.ts` for every state transition with exact arrays and exact `canUndo`/`canRedo` booleans after each step.
   - Include edge cases: same-base no-op, revert-to-original, new edit after undo clears redo, multiple positions, reset, replace, and edited quality sentinel restoration after undo.

3. **Harden working-sequence propagation**
   - In `src/components/TraceViewer.ts`, keep one authoritative working trace path: raw trace + `BaseEditModel` → optional reverse complement → mixed-base call → manual edit re-pin → renderer/current trace.
   - Verify or fix propagation to search/find, reverse-complement display, ORF/restriction annotations, primer/translation-style consumers, reference alignment/variant calling, FASTA export, and FASTQ export.
   - Add focused tests where possible around pure functions or integration seams so the edited sequence, not the raw sequence, is asserted exactly.

4. **Persist edits correctly in viewer session state**
   - Extend `src/workspace/TraceWorkspace.ts` slot state to carry active edit entries if missing.
   - Update `saveCurrentSlot()`, `makeActiveSlot()`, `switchToSlot()`, `commitLoadedTrace()`, and clear/reset paths in `src/components/TraceViewer.ts` so switching traces does not silently drop active edits.
   - Preserve the current behavior that permalink restore can load active edits without restoring undo/redo history unless product review asks otherwise.

5. **Polish edit UI and accessibility**
   - In `src/components/SequencePanel.ts`, ensure base spans expose stable `data-base-index`, `role`, focusability, edited-state ARIA text, and edit-mode styling without destroying focus.
   - In `src/components/TraceViewer.ts`, ensure double-click enters edit mode, typing IUPAC/ACGTN commits an edit, Delete/Backspace reverts to original, Escape cancels edit mode, and focus returns to the same display index after render.
   - Decide whether keyboard-only edit activation needs an explicit shortcut beyond double-click; if added, expose it via ARIA/help text and avoid conflicting with the existing base inspector Enter/Space path.

6. **Polish undo/redo controls**
   - In `src/components/Controls.ts`, keep visible Undo/Redo buttons in the Edit toolbar with accurate disabled states at stack ends.
   - In `src/components/TraceViewer.ts`, support Ctrl+Z, Ctrl+Shift+Z, and Ctrl+Y without intercepting text inputs or textareas.
   - Ensure toolbar and keyboard undo/redo both update sequence panel, renderer, exports, search, annotations, trim, quality track, and permalink state.

7. **Confirm light/dark visual design**
   - In `src/style.css`, verify edited-base and editing-mode tokens have sufficient contrast in light and dark themes.
   - Preserve focus-visible styling and ensure edited highlighting remains distinct from search, selection, ambiguous-base, and trimmed-base styling.

8. **Strengthen FASTA/FASTQ export assertions for Unit A**
   - Verify `src/export/fasta.ts` and `src/export/fastq.ts` consume the display/working trace and not raw trace state.
   - Add or strengthen E2E assertions that an edited base appears in FASTQ sequence line at the exact index and that the quality character at that index is `!`.
   - Add a FASTA propagation assertion if it is not already covered by unit or E2E tests.

9. **Add Playwright E2E for the user workflow**
   - Update `tests/e2e/edit-base.e2e.test.ts` to cover: load fixture, double-click base, type replacement, assert sequence panel text/class, export FASTQ, assert exact sequence-line character and quality sentinel.
   - Cover undo and redo through toolbar and keyboard shortcuts with disabled-state checks at stack ends.
   - Avoid vacuous assertions; use deterministic fixture positions and exact expected values.

10. **Add devlog and register it for Pages**
    - Add a new human-voice devlog entry under `blog/2026-07-11-editable-base-calls-undo-redo/`.
    - Update `blog/index.html` with the new entry.
    - Register the new HTML entry in `vite.config.ts` under `build.rollupOptions.input`.

11. **Update durable learnings if needed**
    - Update `LEARNINGS.md` only if implementation confirms a non-obvious gotcha future contributors would otherwise rediscover, such as workspace edit persistence or mixed-base re-pinning behavior.

12. **Final validation and review gates**
    - Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build`.
    - Run secret scanning on modified files before committing.
    - Run parallel validation for code review and CodeQL.
    - Include `unit-id: 67eb9549-e547-4af2-8305-caf8405471d4` on its own line in the PR body and in the first implementation commit trailer.

## Files expected to change

- `src/editing/BaseEditModel.ts`
- `src/components/TraceViewer.ts`
- `src/components/SequencePanel.ts`
- `src/components/Controls.ts`
- `src/export/fasta.ts`
- `src/export/fastq.ts`
- `src/style.css`
- `src/workspace/TraceWorkspace.ts`
- `tests/core/editModel.test.ts`
- `tests/core/fastq-export.test.ts`
- `tests/core/mixedBase.test.ts`
- `tests/e2e/edit-base.e2e.test.ts`
- `blog/index.html`
- `blog/2026-07-11-editable-base-calls-undo-redo/index.html`
- `vite.config.ts`
- `LEARNINGS.md` if a durable gotcha is confirmed

## Acceptance-criteria verification matrix

| Criterion | Verification |
|---|---|
| Double-click editable called base | Playwright double-clicks a deterministic sequence span and types a replacement base. |
| Keyboard edit input accepts IUPAC/ACGTN | Unit/model tests assert uppercase IUPAC storage; E2E types a replacement through the focused span. |
| Delete/Backspace reverts | E2E or unit-level DOM test asserts revert to original and edited marker removal. |
| Working sequence mutates | Exact unit/integration assertion on edited `baseCalls` and `sequence`. |
| Find/search propagation | Focused test or E2E searches for the edited motif and asserts match at edited coordinate. |
| Reverse-complement propagation | Exact test edits in one orientation, flips strand, and asserts complemented display/export sequence. |
| Translation/ORF propagation | Exact annotation/ORF derivation assertion uses edited working sequence. |
| FASTA export propagation | Exact FASTA output assertion includes edited base. |
| FASTQ export propagation | Playwright download assertion checks exact sequence-line character and `!` quality sentinel at edited index. |
| Undo/redo stack | Vitest exact-value assertions after each apply/undo/redo/no-op/new-edit transition. |
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y | Playwright keyboard shortcut tests assert sequence and class transitions. |
| Toolbar buttons disabled at ends | Playwright role-based assertions before edit, after edit, after undo, and after redo. |
| Edited bases visually distinct | DOM/class tests plus light/dark visual review of `.edited-base` and `.editing`. |
| Revertible edited bases | Unit and E2E assert original base restoration through Delete/Backspace and undo. |
| Focus preserved | Playwright checks focused `data-base-index` after edit and undo/redo refresh. |
| ARIA labels | Playwright asserts role and edited-state ARIA label text on spans/buttons. |
| Light and dark themes | UX/gallery or targeted browser screenshots verify edited state in both schemes. |
| Genuine tests | Tests assert exact arrays, strings, booleans, sequence indices, and FASTQ bytes rather than broad snapshots or ink thresholds. |
| Devlog published | New blog HTML exists, linked from `blog/index.html`, and registered in `vite.config.ts`. |
| CI green | Full command output from lint/typecheck/unit/E2E/build included in handoff. |

## Key risks and mitigations

- **Existing implementation drift:** The repo already contains Unit A/B-like code. Treat implementation as a hardening pass, not a rewrite, and keep changes surgical.
- **Lost edits when switching workspace slots:** Add slot-level edit persistence and a regression test.
- **Mixed-base overwrite:** Preserve the post-`callMixedBases()` re-pin block so user edits win over signal-derived ambiguity calls.
- **Keyboard shortcut conflicts:** Do not intercept undo/redo inside inputs/textareas; keep search input and reference textarea behavior intact.
- **Theme/a11y regressions:** Use existing CSS tokens and Playwright role/ARIA assertions; capture light/dark evidence if UI changes are visible.
- **Vacuous tests:** Prefer exact model state, exact export bytes, exact fixture positions, and exact disabled-state assertions.
