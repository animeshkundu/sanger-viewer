# 02 — Session recovery and workspace bundles

## Summary
Add durable browser sessions so users can close the tab, return later, and resume their Sanger workspace. Pair that with import/exportable workspace bundles for explicit handoff and backup.

## Why this is a differentiator
Sanger review is usually interrupted: users bounce between trace review, cloning notes, and sequence confirmation. Desktop tools feel sticky because they keep state. A browser-native workspace needs the same continuity without requiring a backend.

## Current baseline
The current workspace keeps up to a small number of traces in memory, including per-trace viewport, trim, search, and mixed-base state, but that state disappears on refresh.

## Goals
- Autosave the current workspace locally.
- Restore the last session on reload.
- Let users save named local sessions and export/import them as files.
- Keep all persistence client-side.

## Non-goals
- No cloud sync.
- No hidden background upload.
- No server-owned project model.

## User workflows
1. User loads traces and works normally; the app autosaves changes in the background.
2. After a refresh or crash, the app offers **Restore last session**.
3. User can create named snapshots such as `Clone-17 confirmation` and reopen them later.
4. User exports a workspace bundle to archive an analysis with notes and edits.

## Spec
### Persistence layers
#### A. Recovery session
- Store the latest recoverable workspace in IndexedDB.
- Save on meaningful state changes: trace load, edit, trim change, threshold change, slot switch, alignment change, note change.
- Keep only one auto-recovery session per browser profile.

#### B. Named sessions
- Allow users to save up to a configurable local limit of named sessions.
- Each named session stores metadata: title, updated time, trace count, note count, and data residency mode.
- Provide rename and delete actions.

#### C. Workspace bundle files
- Export `.svws.json` bundle files.
- Support two bundle modes:
  - metadata-only
  - embedded trace bytes
- Importing a bundle should create a new local session instead of mutating the current one silently.

### Stored state
- Workspace slot order and active slot.
- Per-trace analysis state already present in the viewer.
- Free-text session notes and per-trace notes.
- Future-friendly placeholders for contigs, alignments, primers, and variants.

### UX
- On launch, show a passive restore banner if a recovery session exists.
- Add a **Sessions** drawer with:
  - current recovery state
  - named sessions
  - import/export actions
  - storage usage summary
- Show whether a session contains embedded raw traces.
- Let users clear all local analysis data from the same drawer.

### Data lifecycle rules
- Recovery state updates automatically.
- Named sessions update only on explicit save.
- Import always duplicates into a new saved session.
- Deleting a session removes both metadata and embedded trace bytes.

## Acceptance criteria
- Refreshing the page offers recovery of the most recent workspace.
- Named local sessions can be saved, reopened, renamed, exported, imported, and deleted.
- Importing a bundle never destroys the current session without confirmation.
- Large sessions remain usable by storing metadata and prompting for trace reattachment when needed.
- Users can clear all local data from the UI.

## Parallel build slices
1. IndexedDB persistence layer.
2. Recovery banner and restore flow.
3. Named sessions drawer.
4. Bundle import/export UI.

## Dependencies
- Shares a snapshot schema with the permalink spec.
- Enables reliable reuse of batch, contig, and alignment workflows.
