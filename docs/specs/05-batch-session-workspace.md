# Differentiator spec — Batch and session workspace

## Why this matters

The current app already has a lightweight multi-trace workspace. The next differentiator is turning that into a true session layer for batch review: persistent, resumable, and optimized for triaging many samples in one browser-native project.

## Product outcome

Users can review many traces as a named session, persist state locally, batch-apply actions, filter samples by review status, and resume exactly where they left off without redoing navigation or annotations.

## Non-goals

- Multi-user cloud projects
- LIMS integration in the first wave
- Arbitrary binary file synchronization across devices

## User stories

- As a scientist, I can load an entire plate or folder of traces and work through them as a queue.
- As a reviewer, I can mark samples pass/fail/manual-review and filter the batch instantly.
- As a returning user, I can reopen the browser and continue the same session with my notes intact.

## Scope

### In scope

- Named sessions saved in IndexedDB
- Batch import of many local traces
- Sample table with sort, filter, and review status
- Bulk actions for thresholds, labels, exports, and assignment to analysis workflows
- Resume/recover flows for previously opened sessions

### Out of scope

- Shared online projects
- Direct filesystem watchers
- Automatic background sync between browsers

## UX

### Main surfaces

- Session launcher: recent sessions, create new session, import session bundle
- Batch table: sample name, file status, trace status, trim summary, variant/contig flags, notes
- Inspector pane: currently selected sample and its active workflow context
- Batch actions toolbar for tagging, export, and workflow launch

### Review states

At minimum:

- `unreviewed`
- `pass`
- `fail`
- `manual-review`
- `exported`

## Functional requirements

### Persistence

- Autosave session metadata and per-sample review state locally.
- Restore the last active sample, filters, and open analysis panels.
- Detect unresolved local files and prompt for relink instead of discarding state.

### Batch operations

- Import many traces in one action.
- Apply trim/mixed-base presets to selected samples.
- Launch selected samples into contig assembly or reference-alignment workflows.
- Export filtered subsets and review tables.

### Session organization

- Support tags, notes, assay assignment, and optional plate/well metadata.
- Keep sessions lightweight by separating local-file descriptors from derived summaries.
- Allow session duplication for “what-if” reviews without overwriting the original.

## Technical approach

### Data model

Add session records containing:

- session id, name, created/updated timestamps
- sample rows keyed to trace slot or trace source descriptors
- review statuses, notes, tags, and workflow summaries
- table filters, sort state, and active selection

### Storage

- Use IndexedDB for session persistence and larger derived payloads.
- Keep only compact recoverable state in localStorage if a boot-time pointer is needed.
- Version session schemas and migrations explicitly.

### Integration points

- Build on the existing `TraceWorkspace` rather than replacing it.
- Treat contig, reference, primer, and export outputs as attachable workflow summaries per sample.
- Reuse the share-bundle schema for session import/export where practical.

## Parallel-safe implementation slices

1. Add persistent session schema and storage adapters.
2. Add session launcher and recent-session recovery.
3. Add batch import table and review-state filtering.
4. Add bulk actions and workflow launch hooks.
5. Add relink recovery and session export/import tests.

## Acceptance criteria

- Users can reopen a named session and continue from the same sample and filters.
- Batch review status, notes, and workflow summaries survive browser reloads.
- Missing local traces are recoverable through relink flows.
- Batch actions work without breaking the existing single-trace workflow.

## Validation

- Storage tests for create, autosave, migration, and recovery
- UI tests for batch filtering, bulk actions, and resume flows
- Manual test with large local batches to confirm graceful degradation
