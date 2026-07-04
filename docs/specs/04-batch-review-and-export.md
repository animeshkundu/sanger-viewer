# 04 — Batch review board and bulk export

## Goal
Make batch work feel like a real review workflow: triage reads, mark dispositions, apply simple actions in bulk, and export results without opening every file individually.

## Why this is a differentiator
Desktop tools can batch-convert files, but they rarely provide a browser-friendly review board that joins QC, disposition, and export in one lightweight flow.

## Current foundation
- The app already has trimming, reverse-complement, search, editing, consensus export, and multi-trace state.
- Batch intake from spec 03 provides the queue substrate.

## User outcomes
- Mark reads as pass, fail, re-sequence, or needs manual review.
- Bulk-export FASTA/FASTQ/QUAL and review summaries for selected rows.
- Filter a large run to only problematic or high-value reads.

## In scope
- Review statuses and reviewer notes per batch row.
- Bulk actions for status changes, trim mode application, export, and archive/remove.
- Batch summary metrics: ready count, reviewed count, fail count, mean trimmed length, warning count.
- CSV/TSV review summary export alongside sequence exports.

## UX specification
- Add a **Batch review** surface with saved filters and row selection.
- Keep the single-trace viewer as the detail pane for the selected row.
- Show row-level badges for trim warnings, ambiguous-base burden, and parse quality anomalies.
- Bulk export dialog must preview what outputs will be generated and whether they respect current trim/strand/edit state.

## Technical shape
- Extend the batch item model with review metadata and export eligibility state.
- Define consistent export semantics so batch outputs match single-trace exports exactly.
- Keep notes and statuses local-first and serializable through the session system.

## Validation
- Unit tests for batch state mutations and export-selection rules.
- Browser tests for multi-select, status changes, saved filters, and bulk export entry points.
- Regression checks that batch exports preserve the same strand/trim/edit semantics as existing single-item exports.

## Dependencies
- Depends on spec 03.
- Benefits from spec 02 for persistence.

## Non-goals
- LIMS integration.
- Multi-user assignment workflows.
- Statistical reporting beyond direct batch-review needs.
