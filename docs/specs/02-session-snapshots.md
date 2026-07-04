# Differentiator Spec — Session Snapshots

## Outcome
Persist a full local analysis session in the browser so users can close the tab and resume work later without redoing setup.

## Why this wins
Most Sanger tools treat each file open as a fresh start. Persistent browser sessions turn sanger-viewer into a true workspace instead of a transient viewer.

## User value
- Resume a partially reviewed run after a browser restart.
- Keep edits, consensus review decisions, and comparison context together.
- Recover from accidental reloads without losing local progress.

## Scope
### In
- IndexedDB-backed local session storage
- Named sessions with last-opened timestamps
- Automatic save/restore of non-binary analysis state
- Optional reattachment flow for trace files no longer resident

### Out
- Remote sync
- Team accounts
- Infinite historical versioning

## UX
- Add a `Sessions` entry point in the workspace bar.
- Show:
  - current session name
  - last saved timestamp
  - “Save as new”, “Duplicate”, and “Reset session”
- On app open, restore the latest session by default when data exists.
- If stored sessions reference missing files, mark those slots as “Needs file”.

## Data model
- `SessionRecord`
  - session metadata
  - workspace layout and active slot
  - per-slot analysis settings
  - consensus/assembly references by source slot ids
  - user annotations and review flags
- Store binaries separately only when browser quotas permit; otherwise store fingerprints and require reattach.

## Implementation shape
- Create a session repository module over IndexedDB.
- Serialize current `TraceWorkspace` plus higher-level review state.
- Save on important events with debouncing and explicit save on unload.
- Reconcile restored slots with current file handles when available.

## Parallel-safe build slices
1. Session schema and IndexedDB adapter.
2. Auto-save/auto-restore for current workspace state.
3. Session switcher and named-session UI.
4. Missing-file recovery and quota-aware binary policy.

## Acceptance
- Reloading the page restores the last active session state.
- Users can create and switch between named sessions entirely client-side.
- Quota failures degrade gracefully without corrupting saved sessions.
- Session restore never breaks GitHub Pages static hosting assumptions.
