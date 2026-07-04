# 09 — Batch QC queue

## Goal
Support a realistic sequencing run by turning the current single-focus viewer into a triage queue for dozens of traces.

## Why this wins
Biologists often review runs, not isolated files. Fast batch triage is a major workflow advantage over local single-file tools.

## User outcomes
- A user can load many traces at once and immediately see which ones need attention.
- Each trace gets a compact QC card with read length, trim outcome, mixed-base count, and failure flags.
- Users can sort, filter, and open the worst traces first.

## In scope
- Multi-file ingest for local traces.
- Batch summary table or queue view.
- Derived QC metrics using existing trim, consensus, and mixed-base logic where applicable.
- Bulk tags such as `pass`, `review`, `repeat`.

## Out of scope
- Cloud sample sheets.
- LIMS integration.
- Distributed processing.

## Product behavior
1. Extend file input and drag/drop to accept many traces in one action.
2. Parse files in the background and stream results into a queue rather than blocking on a single active trace.
3. Surface sortable columns for file name, called length, trimmed length, average quality, ambiguous-base count, and status.
4. Opening a queue item should reuse the main viewer without losing batch context.
5. Queue-level actions should support export of QC summaries only, not raw trace redistribution.

## Data contract
- Trace summary record per file.
- Derived QC metrics and user review tag.
- Optional links to snapshots, contigs, or variant calls created later.

## Delivery notes
- Reuse worker-based parsing and keep rendering incremental.
- Design the queue so it can coexist with the current workspace tabs.
- Make sure large local batches degrade gracefully on memory-constrained devices.

## Acceptance criteria
- Users can load and review multiple traces in a single batch queue.
- QC sorting/filtering works without opening every trace first.
- Opening, tagging, and exporting queue summaries remain client-side.
- Failed files do not block successful files from appearing.

## Dependencies
- Independent.
