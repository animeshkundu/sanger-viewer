# 02 — Batch Ingest + Sample Sheet Mapping

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Labs process traces in batches, but single-file workflows force repetitive loading, naming, and tracking.

## Outcome
Users can ingest dozens to hundreds of traces, map them to sample metadata, and triage quickly in one browser session.

## Scope (build wave)
- Multi-file ingest with drag/drop and file picker.
- CSV/TSV sample sheet import.
- Filename-to-sample auto-matching with confidence states.
- Batch table with status filters (unreviewed/pass/fail/needs-attention).

## Non-goals
- LIMS writeback in v1.
- Cloud storage integration in v1.

## UX
1. User drops a folder/list of traces.
2. User imports sample sheet.
3. App auto-links traces to rows and highlights unmatched conflicts.
4. User filters batch table and opens traces in workspace tabs.

## Data model
- `BatchSession`
  - `batchId`, `createdAt`
  - `samples[]` (sample id, metadata fields)
  - `traceEntries[]` (file id, parser status, mapped sample id, review status)

## Acceptance criteria
- 100-trace import remains responsive in target browsers.
- Auto-match exposes clear unmatched and duplicate states.
- Batch status filters update counts and table rows correctly.
- Mapping state survives page refresh when session persistence is enabled.

## Risks
- Memory pressure for large batches.
- Inconsistent naming conventions across labs.

## Success metrics
- Time-to-first-reviewed-sample in batch mode.
- Auto-match precision/recall against sample sheet.
