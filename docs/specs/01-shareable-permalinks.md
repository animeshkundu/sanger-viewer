# 01 — Shareable permalinks

## Goal
Let a biologist share the exact browser state of a trace review with a single URL, without any backend service.

## Why this wins
SnapGene Viewer, FinchTV, and Chromas are strong at local inspection, but weak at zero-install handoff. A browser-native viewer should make "look at exactly what I am seeing" the default workflow.

## User outcomes
- A user can copy a link that restores the same trace, zoom, strand, trim mode, mixed-base threshold, search term, selected base, and open panels.
- A recipient can open that link on GitHub Pages and immediately land on the same review state.
- When the source trace is unavailable, the link still explains what is missing and what metadata is required to reopen it.

## In scope
- URL schema for viewer state.
- Restore-on-load flow for local files, bundled samples, and future session-backed assets.
- Copy-link action with success/error states.
- Versioned permalink payload so future releases can migrate older links.

## Out of scope
- Cloud storage.
- Authentication.
- Editing collaboration.

## Product behavior
1. Add a `Share link` action in the main toolbar.
2. Encode state in the URL hash so GitHub Pages base-path deployment keeps working.
3. Prefer compact, human-inspectable fields for shallow state and compressed payloads only when needed.
4. If the trace came from the bundled sample, the link reopens it automatically.
5. If the trace came from a local file, the link restores all non-file state and shows a "choose matching file" prompt with expected file name, length, and checksum hint.
6. If the restored state targets a base outside the current data, the viewer clamps safely and surfaces a non-blocking warning.

## Data contract
- `v`: permalink schema version.
- `src`: sample id, future session asset id, or `local` placeholder.
- `view`: zoom, pan, strand, trim mode, threshold values.
- `inspect`: selected base, hovered locus optional, open annotation chip optional.
- `analysis`: search term, active search hit, mixed-base summary toggles, future reference target id.

## Delivery notes
- Keep serialization in a pure TypeScript module so unit tests do not depend on the DOM.
- Add migration helpers from older schema versions.
- Emit telemetry-free, deterministic URLs.

## Acceptance criteria
- Copying and reopening a permalink reproduces viewer state for bundled sample traces.
- Local-file permalinks reopen state after the user supplies the matching file.
- Invalid or outdated links fail gracefully and never blank the app.
- URL handling remains compatible with the `/sanger-viewer/` production base path.

## Dependencies
- None.
