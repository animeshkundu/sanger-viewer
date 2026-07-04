# 02 — Session snapshots and resume

## Goal
Turn the browser tab into a reliable Sanger workspace that automatically restores a scientist's in-progress session across refreshes, crashes, and device restarts.

## Why this is a differentiator
Desktop trace tools feel trustworthy because closing and reopening does not destroy work. A browser workspace must meet that bar before higher-order analysis features feel safe.

## Current foundation
- `TraceWorkspace` already stores multi-trace slot state.
- Per-trace state already covers strand, trim, search, mixed-base threshold, viewport, and edit history inputs.
- The app is client-side only, so persistence must stay local.

## User outcomes
- Reload the page and get the same open traces and active tab back.
- Recover manual edits and review state after an accidental tab close.
- Pin an explicit named snapshot before running comparisons or exports.

## In scope
- Background autosave of workspace state to browser storage.
- Explicit named snapshots users can save, reopen, duplicate, and delete.
- Restore flow on startup with conflict handling for stale or incomplete sessions.
- Recovery messaging when a snapshot references files that are no longer available locally.

## UX specification
- Show a lightweight **Saved** / **Unsaved changes** workspace status.
- Add **Resume last session** in the empty state when a recoverable session exists.
- Add a **Snapshots** panel with:
  - snapshot name
  - timestamp
  - trace count
  - whether raw trace data is fully resident, partially resident, or file-reconnect required
- On startup, restore the last autosave unless the user dismisses it.
- When a file-backed trace cannot be restored, keep its shell and explain how to relink it.

## Technical shape
- Use IndexedDB for larger session payloads; keep only lightweight pointers or metadata in localStorage if needed for bootstrapping.
- Persist the workspace slot model, per-trace derived state, and explicit edit model state.
- Track schema version and integrity checks so partial writes do not masquerade as valid sessions.
- Distinguish autosave sessions from user-named snapshots.

## Validation
- Unit tests for session serialization, migration, corruption handling, and restore ordering.
- Browser tests for refresh recovery, relink prompts, and named snapshot CRUD.
- Performance checks to ensure autosave does not block pan/zoom or parse flows.

## Dependencies
- Independent of other differentiators.
- Should align its serialized state model with the permalink schema from spec 01 where practical.

## Non-goals
- Cross-device sync.
- Cloud accounts.
- Unlimited persistent storage guarantees beyond browser quotas.
