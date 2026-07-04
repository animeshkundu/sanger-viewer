# Spec 01 — Shareable permalinks

## Goal
Make every useful review state in `sanger-viewer` addressable by URL so a user can send “look at this exact trace, zoom, strand, trim, search, and highlighted position” without screenshots or manual repro steps.

## Why this is a differentiator
Desktop trace viewers are still largely file-local. A browser-native tool should turn trace review into a linkable workflow.

## Current baseline
- The app is a client-side-only Vite site deployed on GitHub Pages.
- `TraceWorkspace` already preserves per-trace viewport, trim, search, and strand state in memory.
- No server exists, so permalinks cannot depend on backend persistence.

## User-facing outcome
- `Copy link` produces a URL that restores:
  - active workspace tab
  - zoom/pan viewport
  - reverse-complement state
  - trim mode + threshold
  - search query + active match
  - mixed-base threshold
  - selected/inspected base
- Built-in sample traces and future public URL-backed traces reopen directly from the link.
- Local-only traces reopen into a “missing source file” state with preserved annotations and a clear reattach prompt.

## Product requirements
1. Use URL hash state so GitHub Pages base-path deployment keeps working.
2. Keep links readable enough for debugging, but compressed enough for realistic workspace state.
3. Never place raw trace signal arrays or private sequence payloads into the URL.
4. Invalid or stale link state must fail soft and keep the viewer usable.
5. Restoring link state must be deterministic across refreshes.

## Proposed implementation shape
- Add `src/session/urlState.ts` for encode/decode, versioning, and schema guards.
- Add a small “share” control near existing export actions.
- Extend `TraceWorkspace` serialization with URL-safe summary state only.
- Add source descriptors per slot:
  - `sample:<id>`
  - `remote:<url>`
  - `local:<fingerprint>` placeholder only
- Use a versioned payload: `#sv=1.<encoded>`

## Acceptance checks
- Refreshing the page preserves the full viewing state for sample and remote-backed traces.
- Copying a link from a trimmed, zoomed, reverse-complement view restores the same state in another tab.
- Local traces show an explicit “reconnect file to continue” banner instead of silently failing.
- Malformed hashes are ignored with a non-blocking message.
- Existing non-share workflows remain unchanged when no hash is present.

## Non-goals
- Uploading traces to any server
- Collaborative editing
- Storing full batch sessions in the URL

## Parallel-safe PR boundary
This spec should stay limited to URL state, slot source descriptors, and the share/restore UI. It should not include session bundles, batch tables, or contig logic.
