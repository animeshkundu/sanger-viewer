# 03 — Batch ingest and QC triage

## Summary
Add a batch workspace for loading dozens to hundreds of traces at once, summarizing read quality, and quickly deciding which traces are ready for downstream assembly or variant review.

## Why this is a differentiator
Real Sanger work is rarely one trace at a time. Biologists receive plates, folders, or runs and first need triage: what passed, what failed, what needs re-sequencing, and what should be paired.

## Current baseline
The viewer can load traces individually and keep a small multi-trace workspace, but there is no batch import surface, no summary table, and no QC ranking.

## Goals
- Support multi-file and folder-style batch import.
- Generate a read-level QC summary without leaving the browser.
- Make downstream actions start from the batch list.

## Non-goals
- No laboratory information management system integration in the first wave.
- No server-backed job queue.
- No automatic scientific interpretation beyond QC and organization.

## User workflows
1. User drags a plate folder or many `.ab1`/`.scf` files into the app.
2. App opens a batch table instead of jumping straight into one trace.
3. User sorts by length, trim pass, ambiguous calls, mean quality, or file name.
4. User opens a trace, marks it passed or failed, and returns to the table without losing context.
5. User selects multiple rows and sends them to contig assembly or reference alignment.

## Spec
### Batch import sources
- Multi-select file picker.
- Drag-and-drop of many files.
- Directory upload where supported by the browser.
- Optional ZIP import in a later slice, not required for MVP.

### Batch table columns
- sample name
- original file name
- inferred direction
- read length
- trimmed length
- mean quality
- ambiguous base count
- pass/fail/manual review state
- notes
- downstream pairing status

### QC scoring
- Compute a default QC badge from existing trimming and mixed-base metrics.
- Provide three buckets: `pass`, `review`, `fail`.
- Let users override the bucket manually.
- Keep algorithm thresholds editable in settings, with visible defaults.

### Batch actions
- Open selected trace in the viewer.
- Pair forward/reverse reads.
- Queue selected reads for contig assembly.
- Queue selected reads for reference alignment.
- Export summary as CSV.

### UX
- Split UI into a batch table and the existing trace viewer.
- Keep row selection and scroll position when users inspect a trace and return.
- Provide keyboard navigation for row review.
- Show import progress and parse failures inline per row.

## Acceptance criteria
- Users can import many traces in one action and review them in a sortable table.
- QC badges are generated automatically from client-side analysis.
- Manual row decisions persist in the current session.
- Selected reads can be handed off to future contig or reference workflows without re-import.
- Batch summaries export cleanly as CSV.

## Parallel build slices
1. Batch import and parse queue.
2. QC summary model.
3. Batch table UI.
4. Row actions and CSV export.

## Dependencies
- Reuses existing parser, trimming, and mixed-base logic.
- Pairs naturally with the session and plate-context specs.
