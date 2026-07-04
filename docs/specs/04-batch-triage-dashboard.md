# Spec 04 — Batch triage dashboard

## Goal
Give users a run-level review surface that helps them decide which reads are good, weak, contaminated, or need repeat work without opening every trace tab manually.

## Why this is a differentiator
Most trace viewers stop at “many files can be opened.” A preferred browser workspace should summarize a whole run and drive action from that summary.

## Current baseline
- Quality trimming, metadata parsing, mixed-base calling, and consensus/mismatch summaries already exist per trace.
- There is no cross-trace dashboard, filtering, or bulk export surface.

## User-facing outcome
- A batch table summarizes every loaded trace with sortable columns.
- Users can filter for failed/low-quality/edited/mixed-base-heavy traces.
- Users can bulk-export FASTA/FASTQ/QUAL or save a filtered review session.

## Product requirements
1. The table must be derived entirely client-side from loaded traces.
2. Columns must include at minimum:
  - file name
  - length
  - trim-kept length
  - mean/median quality
  - mixed-base count
  - strand state
  - edit count
  - batch status tag
3. Row selection must sync with the existing workspace.
4. Filters and sort state must be permalink/session-friendly.
5. Bulk actions must operate on the current filtered or selected subset only.

## Proposed implementation shape
- Add `src/batch/traceSummary.ts` for pure summary derivation.
- Add a dashboard panel that can dock below the workspace bar or open as a side sheet on smaller screens.
- Reuse existing export serializers for bulk sequence export.
- Introduce stable review tags: `pass`, `watch`, `fail`, `needs-repeat`, `reviewed`.

## Acceptance checks
- Sorting and filtering do not mutate the underlying workspace order.
- Selecting a row activates the matching trace tab.
- Bulk exports honor the current selection.
- Summary stats stay correct after edits, trim changes, and reverse-complement toggles.

## Non-goals
- LIMS integration
- Server-backed sample tracking
- Automated variant calling across the entire batch

## Parallel-safe PR boundary
This PR should only add cross-trace summaries, filters, and bulk actions on existing data. File intake orchestration and session persistence stay separate.
