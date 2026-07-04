# Shareable permalinks

## Why this matters

Desktop trace viewers are awkward to review collaboratively because the state lives on one machine. A browser-native Sanger workspace should let a biologist hand a colleague a URL that opens the same read, zoom window, trim mode, strand, selected base, search state, and review context without requiring any server.

## Product outcome

Add a static-site-safe permalink system that recreates a reviewable workspace from the URL alone when the underlying trace assets are already reachable by URL, and falls back to a shareable session bundle when they are not.

## Scope

### In scope

- Single-trace and multi-trace workspace permalinks.
- Encoded view state: active tab, viewport, strand, trim mode, mixed-base threshold, search query, selected/focused base, visible annotations, and edit history summary.
- URL references to remotely accessible trace files, reference files, and session manifests.
- “Copy link” and “Open from link/session” entry points.
- Graceful handling of missing assets, expired URLs, and oversized state.
- GitHub Pages/base-path-safe routing using the URL hash or query payload only.

### Out of scope

- Any backend storage, auth, or server-issued short links.
- Uploading local AB1/SCF binaries to third-party services.
- Real-time collaboration.

## Primary user workflows

1. A user opens one or more traces, trims/reorients/reviews them, then clicks **Copy permalink**.
2. A colleague opens the link and lands in the same workspace state if every referenced asset is reachable.
3. A user working from local files exports a **session bundle** instead of a bare permalink, then shares that file separately.
4. A reviewer opens a broken or partial link and gets a clear recovery UI showing which assets loaded, which failed, and which state could still be restored.

## UX specification

### Entry points

- Global bar button: **Share**
- Share menu actions:
  - **Copy permalink**
  - **Export session bundle**
  - **Open link/session**

### Share dialog contents

- Workspace summary: trace count, active trace, reference presence, edited positions count.
- Link mode selector:
  - **Link to remote assets** when all files have stable URLs.
  - **Session bundle required** when local files are present.
- Privacy note: “Links encode analysis state, not uploaded data.”
- Size indicator with warning state near the browser URL comfort limit.

### Restore behavior

- Successful restore opens directly into the workspace.
- Partial restore shows a non-blocking banner plus per-asset status rows.
- Unrestorable state falls back to the closest valid default rather than a blank page.

## Data and state model

### URL payload

- Use a versioned, compressed JSON payload in the hash fragment so static hosting and project base paths remain untouched.
- Top-level fields:
  - `version`
  - `workspace`
  - `assets`
  - `view`
  - `analysis`
  - `selection`

### Asset descriptors

Each workspace item stores:

- Stable asset URL
- Display name
- File type (`ab1`, `scf`, `fasta`, `genbank`, `session-manifest`)
- Optional checksum
- Optional reference to a shared manifest entry

### Session bundle format

- JSON manifest plus embedded files in a zip container.
- Includes trace binaries, optional reference, workspace state, edits, and derived summaries.
- Re-importing the bundle should be equivalent to opening the shared reviewer state locally.

## Implementation shape

### Slice 1 — State schema and serializer

- Define a versioned workspace-share schema.
- Serialize current review state without raw binary payloads.
- Reject unsupported state explicitly.

### Slice 2 — Restore pipeline

- Parse URL state at startup.
- Fetch referenced assets with progress/error handling.
- Rehydrate workspace slots and restore active view state.

### Slice 3 — Share UI

- Add Share menu/dialog and copy/open affordances.
- Surface local-file limitations clearly.

### Slice 4 — Session bundle fallback

- Export/import portable bundle files for local-only sessions.
- Reuse the same share schema inside the bundle manifest.

## Validation requirements

- Permalinks survive page refresh, new tab open, and GitHub Pages deployment path.
- Restored workspace exactly matches original viewport, strand, trim mode, search query, and selected base.
- Multi-trace ordering and active-tab state persist.
- Missing assets produce actionable error UI, not silent failure.
- Oversized URL payloads trigger a bundle recommendation before copy.

## Acceptance criteria

- A user can share a URL that reopens a reviewable state for remotely reachable traces with no backend.
- A user with local-only traces can export a bundle that reopens the same state on another machine.
- The feature works with the repository’s static deployment model and preserves project base-path support.
- Restore failures are explicit, partial, and recoverable.

## Non-goals and risks

- URLs are not a durable archive for large local datasets; bundle export is the supported path.
- Some browser/network environments will block remote asset fetching; the UX must detect and explain that.
- Schema versioning must be treated as a compatibility contract from the first release.
