# Differentiator Spec — Batch Ingest Queue

## Outcome
Let users drop a full sequencing run into the app and process many traces as a managed queue instead of opening files one by one.

## Why this wins
The current viewer is strong at single-trace inspection; labs need run-level throughput. Batch ingest makes browser-native review viable for daily sequencing work.

## User value
- Load tens to hundreds of traces in one action.
- Track parse progress and failures without blocking the UI.
- Start reviewing usable traces before the full batch finishes.

## Scope
### In
- Multi-file drag/drop and directory import where supported
- Queue model with progress, retry, cancel, and failure states
- Worker-based parsing with bounded concurrency
- Batch metadata summary

### Out
- Server-side preprocessing
- Automatic sample-sheet interpretation in v1

## UX
- Add a `Load batch` action beside single-file open.
- Show a batch drawer with:
  - queued / parsing / ready / failed counts
  - per-file progress rows
  - filters by status
- Newly ready traces become available in the workspace without interrupting the current view.

## Data model
- `BatchJob`
  - id, createdAt, source kind
  - file entries with status, error, parsed summary, optional slot id
- Batch-level derived stats:
  - read length distribution
  - mean quality distribution
  - pass/fail counts

## Implementation shape
- Extend parser worker orchestration from single-file to a concurrency-limited queue.
- Keep queue state outside `TraceWorkspace`; only admitted traces become slots.
- Surface lightweight summaries immediately after parse to avoid full activation cost.

## Parallel-safe build slices
1. Batch queue state machine and worker scheduler.
2. Batch drawer UI and progress rendering.
3. Auto-admit ready traces into workspace slots.
4. Retry/cancel/error recovery behavior.

## Acceptance
- Users can add many traces in one action and continue interacting with the current trace.
- Parse failures are isolated to the affected files.
- Worker concurrency stays bounded and does not freeze the main thread.
- Ready files can be opened before the full batch completes.
