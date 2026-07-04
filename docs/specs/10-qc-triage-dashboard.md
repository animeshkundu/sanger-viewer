# 10 — QC Triage Dashboard + Decision Queue

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
High-throughput Sanger workflows need quick pass/fail triage before deep analysis; per-trace manual inspection is too slow.

## Outcome
A dashboard surfaces quality and analysis signals so users can prioritize traces that need attention.

## Scope (build wave)
- Batch-level QC summary cards (read length, mean quality, trim loss, unresolved calls).
- Decision queue sorted by risk/priority.
- One-click actions: mark pass, send to contig assembly, send to variant review.
- Export triage summary for lab records.

## Non-goals
- Fully automated sign-off without human review.
- Laboratory instrument integration in v1.

## UX
1. User opens batch dashboard.
2. Queue highlights highest-priority traces.
3. User triages through keyboard/touch-friendly actions.
4. Queue updates with completion progress and remaining workload.

## Data model
- `QcSummary` (`traceId`, `qualityScore`, `trimmedFraction`, `flags[]`, `queuePriority`)
- `TriageDecision` (`traceId`, `decision`, `reason`, `timestamp`)

## Acceptance criteria
- Dashboard metrics update when underlying analysis state changes.
- Decision queue ordering is deterministic for same inputs.
- Triage actions are reflected in batch/session state.
- Export includes per-trace metrics and final decision.

## Risks
- Over-reliance on aggregate scores.
- Metric interpretation differences across chemistries.

## Success metrics
- Throughput increase (traces triaged per hour).
- Reduction in time-to-decision for flagged traces.
