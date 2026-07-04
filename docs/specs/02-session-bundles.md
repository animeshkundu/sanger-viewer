# Spec 02 — Session bundles

## Goal
Let users save and reopen a browser workspace as a durable session artifact so long-running review work survives refreshes, laptop restarts, and handoff between teammates.

## Why this is a differentiator
Permalinks solve lightweight sharing; session bundles solve serious work. A browser workspace becomes a real analysis document without requiring any backend.

## Current baseline
- Multi-trace state already exists in `TraceWorkspace`, but only in memory.
- The app already exports sequence and image artifacts, so explicit download flows fit the product.
- The repository must stay client-side only.

## User-facing outcome
- `Save session` downloads a `.sanger-session.json` file.
- `Open session` restores the workspace, including order, active tab, review state, and derived outputs.
- Users can choose:
  - manifest-only sessions for local/private traces
  - embedded sessions that include raw AB1/SCF bytes for portable handoff

## Product requirements
1. Session files must be versioned and self-describing.
2. Manifest-only sessions must preserve file fingerprints and ask for reattachment when trace bytes are absent.
3. Embedded sessions must remain browser-only and never require upload.
4. Restore must preserve current slot-level state, including edits and future review annotations.
5. Large embedded sessions must show size warnings before export.

## Proposed implementation shape
- Add `src/session/sessionBundle.ts` with schema validation and binary packing helpers.
- Add workspace-level import/export commands wired through hidden file inputs like the current trace-open flow.
- Persist:
  - slot order and active slot
  - slot source metadata
  - trim/search/mixed-base/viewport state
  - edit history snapshot
  - consensus and future assembly/alignment review metadata
- Use JSON with base64-encoded raw files for the embedded mode.

## Acceptance checks
- A manifest-only session round-trips all state other than missing raw bytes.
- An embedded session opens on a second machine with no original files present.
- Version mismatches show a readable compatibility error.
- Corrupt bundles fail closed without crashing the app.

## Non-goals
- Cloud sync
- Multi-user conflict resolution
- Replacing lightweight permalinks for quick sharing

## Parallel-safe PR boundary
This spec should only cover session import/export and persistence contracts. URL hash state, batch queue UX, and primer tools stay out of scope.
