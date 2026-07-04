# 03 — Batch intake queue

## Goal
Let users drop a folder-sized set of traces into the app and immediately get a sortable, resumable batch queue instead of manually opening files one by one.

## Why this is a differentiator
Chromas is remembered for blunt batch throughput. A browser-native batch queue can keep that speed while adding richer metadata, non-destructive review state, and portable exports.

## Current foundation
- Parser worker already handles file parsing off the main thread.
- The workspace model already supports multiple traces and persistent per-trace state.
- Metadata extraction and quality summaries already exist.

## User outcomes
- Load dozens of reads in one action.
- See parse status, trace quality, orientation, and sample metadata at a glance.
- Leave and return without losing the review queue.

## In scope
- Multi-file/folder import into a batch queue.
- Parse status states: queued, parsing, ready, warning, failed, reviewed.
- Batch table columns for file name, sample/run metadata, read length, trim summary, and quality summary.
- Resume of batch queues through session persistence.

## UX specification
- Add a dedicated **Batch import** action on the empty state and workspace shell.
- Default landing for a batch is a queue table, not immediate full-screen trace view.
- Selecting a row opens that trace in the existing viewer without leaving the batch context.
- Failed parses stay visible with explicit error reasons and retry/remove actions.
- Queue must support sort, filter, and keyboard row navigation.

## Technical shape
- Build a batch job model separate from the current five-slot active workspace, but allow promotion from queue row to active workspace tab.
- Keep parsing worker-based and throttle concurrency to protect UI responsiveness.
- Reuse existing metadata/quality derivations rather than recomputing in a parallel pipeline.
- Persist queue manifests via the session system.

## Validation
- Unit tests for queue state transitions and resumability.
- Browser tests for importing many traces, opening rows into the viewer, filtering, and retrying failures.
- Performance checks for large batch imports on mid-range laptops.

## Dependencies
- Independent, but pairs naturally with session persistence from spec 02.

## Non-goals
- Server-side jobs.
- Shared lab-wide queues.
- Full analysis automation beyond intake, triage, and handoff to review tools.
