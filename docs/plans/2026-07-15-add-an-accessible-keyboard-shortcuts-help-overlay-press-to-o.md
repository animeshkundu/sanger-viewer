# Plan: accessible keyboard-shortcuts help overlay

- **Date:** 2026-07-15
- **Owner:** Copilot task agent
- **Correlation:** `unit-id: 2e467e1c-7b84-474c-9e20-567aedf582bb`
- **Research:** [`../research/2026-07-15-add-an-accessible-keyboard-shortcuts-help-overlay-press-to-o.md`](../research/2026-07-15-add-an-accessible-keyboard-shortcuts-help-overlay-press-to-o.md)

## Context and assumptions

Add a dependency-free, client-side modal opened by the global `?` shortcut. Treat input, textarea, select, and editable content as typing contexts where `?` must not open the modal. List global and contextual keyboard commands in labeled groups rather than implying every command is globally active. Use native `<dialog>` modal behavior, with explicit focus management and a fallback explicit Tab trap if cross-project browser verification shows native wrapping is insufficient.

## Files to change

1. **`src/components/ShortcutsDialog.ts` (new):** Build the semantic dialog, shortcut groups, open/close lifecycle, focus capture/restoration, idempotent open behavior, Escape/cancel handling, close-button behavior, backdrop dismissal, and cleanup.
2. **`src/components/TraceViewer.ts`:** Create and append the dialog; add a document-level `?` handler that excludes modified keys and typing contexts; ensure the listener and dialog are cleaned up when the viewer disconnects.
3. **`src/style.css`:** Style the backdrop, surface, heading, close button, grouped shortcut rows, and `<kbd>` labels using existing tokens, responsive sizing, and existing focus-ring behavior. Include light/dark compatibility and prevent the dialog from overflowing a narrow viewport.
4. **`tests/e2e/keyboard-shortcuts-help.e2e.test.ts` (new):** Add direct behavioral and adversarial coverage.
5. **`LEARNINGS.md`:** Record any durable native-dialog or focus-management finding discovered during implementation; omit this edit if implementation reveals no reusable learning.
6. **`CHANGELOG.md`:** Add the user-visible shortcut-help feature in the repository’s existing changelog format.

No parser fixtures or trace-rendering modules should change.

## Step-by-step implementation

1. Create a small `ShortcutsDialog` component with a visible “Keyboard shortcuts” heading and grouped rows for:
   - global help and undo/redo;
   - search navigation/clear;
   - sequence inspection and editing;
   - sidebar/workspace navigation;
   - clone-screen navigation.
2. Give the native dialog explicit `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`; make the close button the initial focus target.
3. On open, remember the currently focused HTMLElement, call `showModal()`, and focus the close button. Make repeated opens a no-op so one keypress cannot duplicate state.
4. On close or native `cancel`, close the dialog and restore focus to the remembered opener when it remains connected; otherwise use a safe viewer-root fallback. Support close-button and backdrop dismissal without allowing clicks inside the surface to close it.
5. Verify native Tab and Shift+Tab containment in both Playwright projects. If either project permits focus to escape, intercept Tab in the component and wrap between its first and last focusable controls.
6. Integrate one document-level shortcut handler in `TraceViewer.ts`. Open only for `event.key === "?"` with no Ctrl/Cmd/Alt modifiers and no input, textarea, select, or contenteditable target. Prevent default only when opening help.
7. Extend the existing disconnect cleanup to remove the help listener and destroy/close the component, avoiding stale global listeners if the viewer is recreated.
8. Add token-based styles that match existing surfaces, borders, typography, radii, and focus treatment; constrain width/height and allow internal scrolling for small viewports.
9. Add a focused Playwright spec that would fail before implementation:
   - press Shift+/ from an existing focusable control and assert one visible dialog with the expected accessible name, `aria-modal`, and representative shortcut labels;
   - assert focus moves to the close button;
   - press Tab and Shift+Tab enough to prove focus remains within and wraps through the dialog;
   - press Escape and assert dismissal plus exact focus restoration to the opener;
   - assert `?` in the search input does not open help or alter normal typing;
   - reopen and dismiss via the close button/backdrop to cover non-Escape paths;
   - confirm the loaded trace canvas remains visible/painted after open/close;
   - exercise Ctrl/Cmd+Z and redo after dialog dismissal using the existing edit workflow, or retain the existing dedicated regression test and run it explicitly.
10. Update the changelog and, only if warranted by a reusable discovery, `LEARNINGS.md`.

## Risks and mitigations

- **Shortcut collision while typing:** Ignore editable controls and modified key combinations; test the search-input path.
- **Focus escaping or not returning:** Capture the exact opener, test forward/reverse wrapping, restore only connected elements, and provide a safe fallback.
- **Escape reaching existing handlers:** Handle the modal’s `cancel` event and stop the handled key path so export/search/base-inspector Escape behavior is unchanged when the modal is closed.
- **Listener leaks:** Extend the viewer’s existing disconnect cleanup and test repeated open/close without duplicate dialogs.
- **Misleading shortcut documentation:** Group contextual commands and use labels such as “Search focused” and “Clone screen focused.”
- **Trace/UI regression:** Keep modal state independent of trace state and renderer; assert the existing loaded canvas remains visible and painted.
- **Small-screen overflow/dark mode:** Use existing tokens, responsive dimensions, and a scrollable dialog body; verify both configured Playwright projects and dark-mode computed styles or screenshot evidence.

## Acceptance-criteria verification

1. **“?” opens a modal listing shortcuts:** Playwright presses Shift+/ and verifies a single visible, named dialog containing global and contextual shortcut rows.
2. **Focus moves into it:** Assert the close button is `document.activeElement` immediately after opening.
3. **Focus is trapped:** Assert repeated Tab and Shift+Tab never move outside the dialog and wrap at both boundaries.
4. **Escape closes it:** Press Escape and assert the dialog is hidden.
5. **Focus returns:** Focus a known toolbar control before opening and assert that exact element regains focus after Escape and close-button dismissal.
6. **Proper ARIA:** Assert dialog role, accessible name from the visible heading, `aria-modal="true"`, and an accessible close-button name.
7. **Matches existing UI:** Verify styles use current design tokens, remain usable in dark mode and narrow/tablet viewport, and capture before/after browser evidence for the PR.
8. **No shortcut or trace regressions:** Run the existing edit shortcut E2E case, the new typing-context case, the full E2E suite, and confirm the chromatogram remains rendered after modal use.
9. **Includes a test:** Commit the new Playwright spec with direct open, trap, close, return-focus, typing-context, and repeated-use assertions.

## Validation and Definition of Done

Run and preserve actual verbatim output for:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:e2e`
5. `npm run build`

Also run the new Playwright spec and the existing undo/redo regression spec directly during iteration. Do not skip, stub, weaken, or delete tests. Verify every acceptance criterion above individually in the implementation handoff, include browser evidence for the UI change, and report any blocker rather than reducing scope.

## Follow-ups

- No backend, parser, fixture, ADR, or dependency work is expected.
- Do not deploy or merge without explicit human approval.
