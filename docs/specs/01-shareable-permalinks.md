# Differentiator spec — Shareable permalinks

## Why this matters

SnapGene Viewer, FinchTV, and Chromas are mostly single-user desktop endpoints. sanger-viewer can win by making every review state easy to reopen, cite, and hand off in-browser without introducing a backend.

## Product outcome

Users can share a URL that restores the same workspace state: active trace, strand, zoom window, trim settings, mixed-base threshold, search hits, selected base, annotations, and review notes. Public or URL-addressable traces should reopen directly from the permalink. Private local traces should reopen through a portable workspace bundle with a clear relink flow.

## Non-goals

- Hosting trace files on a new server
- Multi-user live collaboration
- End-to-end encryption or access control beyond what the browser and remote file host already provide

## User stories

- As a bench scientist, I can send a link to a colleague so they land on the exact mixed-base site I am discussing.
- As a reviewer, I can bookmark a trace state and reopen it later on another machine.
- As a lab lead, I can attach a permalink or bundle to a ticket and preserve the evidence window used for a call.

## Scope

### In scope

- URL-serializable single-trace and multi-trace workspace state
- Deterministic state hydration on page load
- Optional trace-source descriptors for remote files
- Portable workspace export/import for local-only traces
- GitHub Pages-safe routing that preserves the `/sanger-viewer/` base path

### Out of scope

- Browser upload to third-party storage
- Conflict resolution between concurrent editors
- User accounts or cloud sync

## UX

### Primary entry points

- `Share` button in the workspace bar
- `Copy link` action when all required trace sources are restorable from URLs
- `Export share bundle` action when local files prevent a pure URL restore
- Landing-page restore banner when a permalink opens without all required files

### Restore states

1. **Fully restorable link**: all traces load automatically and the viewport jumps to the saved locus.
2. **Partially restorable link**: layout, notes, and sample identities load, and the UI prompts the user to relink missing local traces.
3. **Bundle import**: user opens a `.svws.json` bundle and the app restores workspace state plus embedded derived review data.

## Functional requirements

### Session state model

Persist at minimum:

- workspace version
- active slot id and slot order
- per-slot file identity, orientation, trim mode, trim threshold, mixed-base threshold
- viewport state and selected base
- search query and active hit
- manual base edits
- annotation visibility and selection state
- user-entered notes and review labels

### Source descriptors

Each trace slot must declare one source mode:

- `remote-url`: fetchable URL plus optional integrity hash
- `local-file`: original file metadata and relink token
- `derived-only`: bundle contains enough rendered review data for read-only reopening

### URL format

- Use the hash fragment, not server routes, so GitHub Pages base-path deployment stays intact.
- Use a versioned, compressed payload.
- Keep the URL limited to state and remote-source descriptors only.
- Refuse to inline raw chromatogram channel arrays into the URL.

### Share bundle format

`*.svws.json` should contain:

- workspace state
- trace source descriptors
- optional derived review payloads for read-only recovery: base calls, qualities, peak positions, consensus strings, notes
- spec version and generator version

## Technical approach

### Serialization

- Introduce a versioned workspace schema that wraps current `TraceWorkspace` slot state.
- Normalize all serializable state into plain JSON.
- Compress payload before base64url encoding into the hash fragment.

### Restore pipeline

1. Parse hash state on load.
2. Validate schema version.
3. Restore workspace shell first.
4. Resolve trace sources.
5. Hydrate derived analyses after trace load.
6. Focus the saved locus and announce restore status.

### Failure handling

- Unknown schema version: show import error with upgrade guidance.
- Missing remote trace: keep workspace shell and mark slot unresolved.
- Missing local trace: show relink CTA and preserve all non-file state.
- Oversized share request: fall back to bundle export.

## Parallel-safe implementation slices

1. Add serializable workspace schema and import/export helpers.
2. Add hash-based restore on app boot with base-path-safe routing.
3. Add share UI for copy-link vs export-bundle branching.
4. Add relink flow and unresolved-slot UX.
5. Add fixture-driven restore tests for versioning and degraded recovery.

## Acceptance criteria

- A copied permalink restores the exact review state for URL-addressable traces.
- Opening a local-only permalink preserves shell state and clearly prompts for relink instead of failing silently.
- Exported bundles reopen offline in the same app build.
- State format is versioned and backward-compatible for at least one prior schema version.
- GitHub Pages deployment keeps working under `/sanger-viewer/`.

## Validation

- Unit tests for schema encode/decode, version migration, and slot restore
- Browser tests for copy-link, reload, and missing-file relink flows
- Manual test with a GitHub Pages production build URL
