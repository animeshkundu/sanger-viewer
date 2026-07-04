# 02 — Batch intake and QC queue

- Status: Proposed
- Build wave: D1
- Depends on: none
- Enables: high-throughput review, nightly run triage, plate-style workflows

## Goal
Turn the single-file viewer into a batch-aware intake surface that lets users load many traces at once, rank what needs attention, and move through a run efficiently.

## Why this matters
Desktop viewers are fine for one file at a time. Labs prefer a workspace when they need to clear dozens of reads, spot failed reactions, and separate clean calls from re-sequence candidates.

## User outcomes
- A user can drag in a folder or multi-select many `.ab1` / `.scf` files.
- The app builds a queue with parse status, read length, quality summary, and obvious failure flags.
- The user can move through the queue with keyboard shortcuts and one-click filters.

## Scope
- Multi-file ingest with progress, cancellation, and partial-failure handling.
- Queue table/cards showing file name, trace type, base count, trim summary, mixed-base burden, and basic pass/warn/fail state.
- Sort and filter by quality, file name, failure mode, and reviewed/unreviewed state.
- Bulk actions for mark reviewed, export selected, and remove from queue.

## QC heuristics
- Flag empty/parse-failed files.
- Flag low trimmed length, poor mean quality, and unusually high ambiguous-base counts.
- Keep the heuristic thresholds user-visible and adjustable later.

## UX requirements
- Queue remains usable while parsing continues in the background.
- Failed files stay visible with actionable error messages.
- Opening a queue item restores the prior per-trace analytical state for that item.
- The queue works with mouse, keyboard, and touch targets appropriate for tablet use.

## Implementation notes
- Build on the existing worker-based parsing path and workspace model.
- Keep batch metadata lightweight so large runs do not pin all raw traces in memory.

## Acceptance criteria
- A user can load at least 96 traces in one action without freezing the UI.
- Queue sorting/filtering works before the full batch has finished parsing.
- Parse failures do not block successful files from entering review.
- Automated tests cover batch ingest, queue filtering, and partial-failure recovery.

## Non-goals
- Plate map editing in the first release.
- Cloud sync of batch runs.
