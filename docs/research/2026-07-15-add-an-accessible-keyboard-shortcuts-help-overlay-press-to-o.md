# Research: accessible keyboard-shortcuts help overlay

- **Date:** 2026-07-15
- **Owner:** Copilot task agent
- **Correlation:** `unit-id: 2e467e1c-7b84-474c-9e20-567aedf582bb`

## Context

The work unit asks for a discoverable keyboard-shortcuts modal opened with `?`, with modal focus behavior, Escape dismissal, focus restoration, accessible naming, styling consistent with the viewer, and regression coverage.

## Findings

### Application composition

- The viewer is framework-free TypeScript. `createTraceViewer()` creates the application DOM and owns the long-lived event listeners (`src/components/TraceViewer.ts:127-201`).
- UI pieces are created as focused component modules and composed into the viewer (`src/components/TraceViewer.ts:203-256`). A `ShortcutsDialog` component would follow this pattern without adding a dependency.
- A `MutationObserver` tears down document-level listeners when the viewer root is disconnected (`src/components/TraceViewer.ts:401-417`). Any new global shortcut listener must be removed there too.

### Existing keyboard behavior to document

- Global undo/redo uses Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z; Ctrl/Cmd+Y also redoes. It deliberately ignores text inputs and textareas (`src/components/TraceViewer.ts:2181-2214`).
- Search uses Enter for the next result, Shift+Enter for the previous result, and Escape to clear (`src/components/TraceViewer.ts:1928-1937`).
- A focused sequence base uses Enter/Space to open its inspector, Escape to close, and Delete/Backspace to restore the original call. IUPAC characters apply only after explicit edit-mode entry (`src/components/TraceViewer.ts:2120-2167`).
- Sidebar tabs implement Arrow Left/Right and Home/End navigation (`src/components/TraceViewer.ts:362-380`).
- A focused workspace tab uses Delete/Backspace to close when more than one trace is open (`src/components/WorkspaceBar.ts:81-86`).
- The focused clone screen supports Arrow Left/Right, bracket keys for mismatch navigation, and Home/End (`src/components/CloneScreenPanel.ts:75-105`).

These interactions are contextual rather than all global. The overlay should group and label them as such so it does not imply that every key works everywhere.

### Accessibility and styling

- The app already provides a global, tokenized `:focus-visible` treatment and light/dark design tokens (`src/style.css:1-357`, `src/style.css:379-384`).
- There is no existing modal overlay or focus-trap utility in `src/`; the base inspector has dialog semantics but is a non-modal contextual panel (`src/components/BaseInspector.ts`, `tests/e2e/base-inspector.e2e.test.ts:25-56`).
- A native `<dialog>` opened with `showModal()` provides platform modal behavior and keeps the implementation client-side and dependency-free. The component should still explicitly capture the opener, move focus to its close button, handle `cancel`, and restore focus so the acceptance criteria are deterministic.
- The dialog should use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to its visible heading. A visible close button gives users a non-keyboard dismissal path.

### Test conventions and commands

- End-to-end behavior is covered with Playwright under `tests/e2e/`; keyboard and ARIA assertions already use `page.keyboard`, role locators, focus checks, and Escape behavior (`tests/e2e/ux-a11y.e2e.test.ts:195-238`, `tests/e2e/toolbar-hierarchy.e2e.test.ts:92-105`).
- Tests must be deterministic, independent, and focused rather than broad snapshots (`.github/instructions/tests.instructions.md:1-10`).
- The repository scripts are `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build` (`package.json:6-16`).

## Assumptions and open notes

- **Assumption:** `?` means an unmodified question-mark key event (`event.key === "?"`), normally Shift+/. Ctrl/Cmd/Alt-modified variants will not open help.
- **Assumption:** The shortcut is global except while focus is in an input, textarea, select, or editable element, where typing must remain untouched.
- **Assumption:** “Existing keyboard shortcuts” includes both global and meaningful contextual keyboard commands; the overlay will identify each context.
- **Open note:** Native `<dialog>` behavior must be confirmed in both configured Playwright projects (desktop Chrome and Chromium iPad emulation). If focus wrapping differs, add an explicit Tab/Shift+Tab trap while retaining the same component API.

## Related artifacts

- Implementation plan: [`../plans/2026-07-15-add-an-accessible-keyboard-shortcuts-help-overlay-press-to-o.md`](../plans/2026-07-15-add-an-accessible-keyboard-shortcuts-help-overlay-press-to-o.md)
- No issue, PR, or ADR was supplied.
