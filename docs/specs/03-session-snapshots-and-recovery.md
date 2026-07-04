# 03 — Session Snapshots + Recovery

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Browser crashes/reloads can erase curation effort when analysts review many traces over long sessions.

## Outcome
Workspace state autosaves locally and can be recovered after refresh, crash, or accidental tab close.

## Scope (build wave)
- Local snapshot persistence (IndexedDB/localStorage hybrid).
- Configurable autosave cadence and manual checkpoint save.
- Recovery banner on reload with restore/discard choices.
- Snapshot pruning policy to cap storage usage.

## Non-goals
- Cross-device sync in v1.
- Multi-user concurrency resolution.

## UX
1. User works in multi-trace workspace.
2. App saves snapshots in background.
3. On reload, user sees **Restore previous session?** prompt.
4. User restores to prior active tab and analysis state.

## Data model
- `SessionSnapshot`
  - `snapshotId`, `savedAt`, `schemaVersion`
  - `workspaceState`
  - `batchState`
  - `analysisState`
  - `integrity` (checksums)

## Acceptance criteria
- Restored session reproduces tabs, active trace, and analysis settings.
- Corrupt snapshots are detected and skipped safely.
- Snapshot storage respects configurable max size and LRU pruning.
- Recovery flow works with GitHub Pages base-path routing.

## Risks
- Large snapshots affecting startup time.
- Browser storage quota variability.

## Success metrics
- Recovery success rate after unclean close.
- Median restore time.
