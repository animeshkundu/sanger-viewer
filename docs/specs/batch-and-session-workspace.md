# Spec: Batch operations and persistent session workspace

## Goal
Extend the current tabbed viewer into a durable browser workspace that can persist sessions locally, recover work after reloads, and run bulk Sanger tasks without forcing users into desktop batch tools.

## Why this is a differentiator
- Chromas is known for batch conversion, but not for modern session continuity.
- Benchling/Geneious feel stronger because workspaces persist and related records stay together.
- `sanger-viewer` can combine lightweight browser access with durable local sessions and bulk actions.

## User outcomes
- A user can drop a folder of traces into the app and queue repeated actions once.
- A user can reload the page and recover prior workspaces, including edits and compare context.
- A user can save a portable session bundle for handoff or archival.

## Scope
### In scope
- Persistent local session storage using IndexedDB.
- Workspace restore after reload/crash for:
  - slot order and active tab
  - edits with undo/redo history
  - trim/search/mixed-base settings
  - compare/consensus state
  - imported references and primers
- Batch actions across selected traces:
  - FASTA export
  - FASTQ export
  - PNG/SVG export
  - trim-and-export
  - alignment/variant report once the reference spec exists
- Portable `.svsession.json` manifest plus trace-file attachment workflow.
- Recent sessions list on the landing surface.

### Out of scope
- Background sync to a cloud account.
- Server-side job runners.
- Infinite retention of large binary blobs without user controls.

## UX
1. User opens many traces or drags a directory selection into the app.
2. App creates or updates a named session automatically.
3. User can choose **Batch Actions** to run exports across selected traces.
4. On revisit, the landing view offers **Resume recent session**.
5. User can export a session manifest for offline handoff or archival.

## Session model
```text
WorkspaceSession
- id
- name
- createdAt
- updatedAt
- slots[]
- assemblies[]
- references[]
- primers[]
- recentActions[]
- binaryAssetIndex[]
```

## Technical approach
- Move the current in-memory workspace state into a serializable session boundary.
- Persist metadata eagerly and larger trace blobs opportunistically with storage-usage warnings.
- Separate durable logical state from transient render caches so restores stay fast.
- Batch operations should stream one item at a time through existing exporters and surface per-item success/failure.
- Preserve GitHub Pages compatibility by keeping all persistence browser-local.

## PR slices
1. Add session schema, serializer, and IndexedDB adapter with tests.
2. Persist/restore current workspace state including edit history.
3. Add recent-session landing UI and save/resume flows.
4. Add batch action queue UI and per-item export reporting.
5. Add portable session manifest export/import.

## Acceptance criteria
- Reloading the app can restore an edited multi-trace workspace without losing undo/redo history.
- Batch export reports success/failure per trace and never blocks the whole app silently.
- Recent sessions degrade gracefully when binary assets were cleared or are missing.
- Session persistence works without breaking the existing fast single-trace path.

## Dependencies
- Builds directly on the current workspace model and hardening work around durable edits.
- Shareable permalinks remain separate: links travel via URL, sessions persist via local storage and exportable manifests.
