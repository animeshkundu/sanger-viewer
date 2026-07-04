# 02 — Review snapshots

## Goal
Turn a transient trace inspection into a durable, browser-native review artifact that can be reopened, exported, and attached to lab discussions.

## Why this wins
A raw permalink is useful for navigation; a review snapshot is useful for decision-making. This is the layer that makes sanger-viewer feel like a workspace rather than a viewer.

## User outcomes
- A user can save named snapshots such as "heterozygous peak at exon 7" or "failed reverse read".
- A snapshot captures the locus, annotations, notes, and the exact visual state needed for handoff.
- A user can export snapshots as a compact JSON sidecar that another browser session can import.

## In scope
- Snapshot create/rename/delete flows.
- Snapshot list grouped within the active trace or future session.
- Optional note field and status tags such as `review`, `confirm`, `pass`, `fail`.
- Import/export format for offline handoff.

## Out of scope
- Multi-user live comments.
- Server-hosted notebooks.

## Product behavior
1. Add a `Snapshot` action beside sharing/export controls.
2. Each snapshot stores a title, optional note, timestamp, locus anchor, and viewer-state reference.
3. Selecting a snapshot restores the relevant viewport and highlights the target base range.
4. Exported snapshot bundles exclude raw chromatogram signal unless explicitly paired with a future session package.
5. Imported snapshot bundles validate schema version before being merged into local browser state.

## Data contract
- Snapshot id and title.
- Optional note and status tag.
- Anchor type: base index, search match, annotation feature, or future variant id.
- Embedded viewer-state payload or pointer to permalink serializer.

## Delivery notes
- Reuse the permalink serializer instead of creating a second state format.
- Store snapshots in browser persistence first; keep import/export file-based.
- Design list rendering so future batch review queues can show snapshot counts.

## Acceptance criteria
- Users can create, reopen, edit, and delete snapshots without losing trace state.
- Exported snapshot bundles round-trip in a fresh browser session.
- Snapshot import rejects unsupported versions with a clear error.
- Snapshots remain entirely client-side.

## Dependencies
- Builds on `01-shareable-permalinks.md`.
