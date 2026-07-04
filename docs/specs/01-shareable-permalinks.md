# Differentiator Spec — Shareable Permalinks

## Outcome
Let users share an exact browser state with a URL that reopens the same trace review context without any server dependency.

## Why this wins
Desktop viewers trap review state on one machine. A browser-native permalink makes Sanger review collaborative, reproducible, and easy to hand off in labs and support threads.

## User value
- A biologist can copy a link that preserves viewport, strand, trim mode, mixed-base threshold, selected base, search query, and enabled overlays.
- A reviewer can open the link and land on the same locus with the same analysis settings.
- Labs can attach permalinks to tickets, ELNs, and QC notes.

## Scope
### In
- URL-safe encoding of viewer state
- Import/export of state from `location.hash`
- Support for local traces and demo traces
- Graceful handling when trace files are missing locally

### Out
- Cloud storage
- Multi-user live editing
- Uploading trace binaries to a backend

## UX
- Add `Copy link` in the toolbar or workspace bar.
- Use hash-based routing so GitHub Pages project base path support stays intact.
- When the link references files not currently available, open a recovery banner:
  - show expected filenames
  - allow the user to reattach local files
  - preserve the rest of the analysis state
- Show a small “state restored” toast on successful hydration.

## State model
- Versioned `ViewerPermalinkV1`
- Fields:
  - workspace slot order
  - active slot id
  - per-slot file fingerprint (`name`, `size`, `lastModified`, optional short checksum)
  - strand, trim settings, search state, mixed-base threshold
  - viewport window and selected/inspected base
  - enabled analysis overlays
- Encode as compressed JSON in `location.hash`.

## Implementation shape
- Add a pure serializer/deserializer module under `src/workspace/`.
- Introduce a hydration boundary in `TraceViewer` after file load and before first render.
- Listen for relevant UI state changes and debounce URL updates.
- Keep parser worker and rendering logic unchanged; only wire state in/out.

## Parallel-safe build slices
1. Define permalink schema and codec utilities.
2. Restore single-slot state from hash.
3. Expand to multi-slot workspace state.
4. Add file-reattach recovery UI.

## Acceptance
- Copying a permalink and reopening it restores the same visible base range and analysis settings.
- Hash-only navigation works under `/sanger-viewer/`.
- Missing files do not crash the app and instead show recoverable UI.
- Unknown schema versions fail closed with a clear message.
