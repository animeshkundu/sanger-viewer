# Spec 03 — Batch ingest queue

## Goal
Turn multi-file loading into a first-class intake workflow for plates and sequencing runs instead of a repeated one-file-at-a-time action.

## Why this is a differentiator
Chromas is known for batch conversion, but not for a modern browser-native intake flow. `sanger-viewer` can make batch opening feel fast, transparent, and recoverable.

## Current baseline
- The viewer already supports a capped multi-trace workspace.
- Loading is worker-backed per trace, but the UI is still centered on one or two ad hoc file opens.

## User-facing outcome
- Users can drop dozens of `.ab1` and `.scf` files at once.
- A batch queue panel shows parse progress, failures, duplicate detection, and naming normalization.
- The user can continue reviewing already-loaded traces while the queue drains in the background.

## Product requirements
1. Parsing must be concurrency-limited to protect browser responsiveness.
2. Queue rows must show: pending, parsing, loaded, duplicate-skipped, failed.
3. Duplicate handling must be explicit and deterministic.
4. Queue actions must include cancel pending, retry failed, and load only selected items.
5. The queue must work without breaking the existing single-file flow.

## Proposed implementation shape
- Add `src/workspace/BatchLoader.ts` as a queue/orchestrator around the existing worker parse path.
- Add a collapsible batch drawer near the workspace bar.
- Normalize each file into a batch item with:
  - original file name
  - optional inferred well/sample token
  - parse status
  - duplicate fingerprint
  - created trace slot id
- Default worker concurrency: 2 to 4 active parses.

## Acceptance checks
- Dropping a mixed batch loads valid files and reports invalid ones without aborting the full run.
- The active trace remains interactive while background parsing continues.
- Duplicate files never create silent duplicate tabs.
- Cancel stops only pending work; already parsing items finish cleanly.

## Non-goals
- Plate-level QC scoring
- Assembly or alignment logic
- Session persistence beyond current memory state

## Parallel-safe PR boundary
Keep this PR limited to file intake, queue state, and parser orchestration. Triage tables, bulk actions, and session export belong in later specs.
