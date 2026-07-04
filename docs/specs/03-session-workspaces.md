# 03 — Durable browser session workspaces

**Status:** Proposed  
**Outcome:** Closing the tab or laptop does not destroy an in-progress Sanger review workspace.

## Why this matters
A browser-native tool only beats desktop incumbents if it feels trustworthy. Durable sessions are the reliability layer behind permalinks, batch triage, and multi-tab review.

## Scope
- Persist workspace tabs, active tab, edits, undo/redo stacks, filters, and queue state in IndexedDB/OPFS.
- Auto-restore the last session on reopen.
- Allow explicit named session snapshots from the UI.
- Keep all persistence local to the browser.

## Non-goals
- No cloud account or backend sync.
- No cross-browser portability in the first slice.
- No attempt to persist raw local-file handles where browser permissions disallow it.

## UX spec
- Show a **Restore last session** empty-state card when recoverable state exists.
- Add **Save session**, **Duplicate session**, and **Clear session** actions in workspace controls.
- Use autosave with visible last-saved feedback.
- If a session contains local-only files that need reattachment, restore the structure and mark those tabs clearly.

## Data model
```ts
interface SavedSession {
  id: string
  name: string
  updatedAt: string
  workspaceState: WorkspaceState
  attachments: Array<{
    tabId: string
    kind: 'opfs-trace' | 'missing-local-file' | 'remote-url' | 'sample'
    key: string
  }>
}
```

## Implementation slice
- Introduce a storage adapter with IndexedDB metadata + optional OPFS blobs.
- Move durable edit/undo/redo state fully into workspace/session state.
- Add restore conflict handling when a permalink and a saved session both exist.
- Keep serialization versioned for forward-compatible migrations.

## Acceptance criteria
- Reloading the app restores an edited multi-tab workspace.
- Undo/redo and selected tab survive restoration.
- Missing local attachments are shown explicitly and can be reattached without losing other state.
- Clear-session removes durable state and suppresses future auto-restore.

## Validation plan
- Unit tests for session serialization and migration.
- E2E test: edit a trace, reload, confirm restored edits and undo state.
- Manual browser check for storage quota and failure messaging.
