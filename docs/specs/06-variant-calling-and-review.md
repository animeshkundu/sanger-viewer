# 06 — Variant Calling + Review Queue

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Variant interpretation needs a repeatable queue that combines calls, quality evidence, and analyst decisions.

## Outcome
Users get candidate SNV/indel calls with confidence tiers and a review workflow tied to chromatogram evidence.

## Scope (build wave)
- Variant candidate extraction from alignment and signal model.
- Confidence scoring bands (high/medium/low).
- Review queue with decision states (accept/reject/needs-review).
- Export reviewed variants as CSV/TSV and VCF-lite.

## Non-goals
- Clinical annotation databases in v1.
- CNV/structural variant support.

## UX
1. User runs variant calling on aligned trace/contig.
2. App presents sortable call queue.
3. Clicking a call focuses exact chromatogram locus with peak evidence.
4. User records decision and optional note.

## Data model
- `VariantCall`
  - `id`, `type`, `position`, `ref`, `alt`
  - `score`, `qualitySignals`
  - `status`, `reviewNote`

## Acceptance criteria
- Queue supports filtering by status/type/confidence.
- Decision changes are undoable within session.
- Export includes review decision and evidence fields.
- Calls remain linked to exact trace coordinates.

## Risks
- False positives in noisy regions.
- Overconfidence from simplified scoring.

## Success metrics
- Analyst agreement rate on reviewed calls.
- Time per accepted call.
