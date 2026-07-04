# Differentiator Spec — Batch QC Review Board

## Outcome
Provide a run-level QC board that ranks traces by review priority and lets users triage large batches quickly.

## Why this wins
Competing viewers usually leave QC triage to spreadsheets or manual note taking. A built-in board turns the viewer into the first-stop quality workstation.

## User value
- Instantly spot failed reactions, weak reads, short reads, and mixed-base-heavy traces.
- Sort and filter by quality metrics before opening each sample.
- Mark traces as pass, fail, re-sequence, or needs-review.

## Scope
### In
- Derived QC metrics from parsed traces
- Sort/filter/group UI
- Manual review labels stored in the session
- Bulk navigation from board rows into trace view

### Out
- Laboratory information management system integration
- Automated wet-lab decision making

## UX
- Add a board view reachable from batch mode.
- Default columns:
  - filename
  - trimmed length
  - mean quality
  - ambiguous base count
  - strongest mixed-base window
  - status label
- Include saved filters like “review failures first” and “show only mixed traces”.

## Data model
- `QcSummary`
  - file id
  - parse status
  - trimming summary
  - mixed-base summary
  - optional assembly/alignment status
  - user review label

## Implementation shape
- Reuse existing trim and mixed-base logic to produce cheap summary metrics.
- Store QC summaries in batch/session state, not inside render components.
- Opening a row should activate the existing workspace trace rather than duplicate it.

## Parallel-safe build slices
1. QC summary derivation utilities.
2. Board table/list UI.
3. Review label persistence.
4. Saved filters and priority ranking.

## Acceptance
- A user can triage a loaded batch without opening every trace first.
- Review labels persist across session restore.
- QC ranking is deterministic for the same inputs and settings.
- The board remains usable on tablet-width layouts.
