# 05 — Reference Alignment Workspace

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Users need immediate context against expected reference sequence to confirm constructs and spot deviations.

## Outcome
Each trace/contig can align to a reference in-browser with synchronized chromatogram + sequence navigation.

## Scope (build wave)
- Reference import (FASTA/plain sequence).
- Global/local alignment mode selection with sensible defaults.
- Alignment viewer with synchronized cursor and gap highlighting.
- Region jump controls (start/end/indel/snvs).

## Non-goals
- Genome-scale mapping in v1.
- Remote reference catalog services.

## UX
1. User loads trace/contig and reference.
2. App computes alignment and displays summary score.
3. User jumps through mismatches/indels while chromatogram updates.

## Data model
- `ReferenceRecord` (`id`, `name`, `sequence`, `length`)
- `AlignmentResult`
  - `queryId`, `referenceId`
  - `score`, `identityPct`, `coveragePct`
  - `cigarLikeOps[]`
  - `events[]` (mismatch/insertion/deletion)

## Acceptance criteria
- Alignment summary shows identity, coverage, and event counts.
- Cursor sync works both sequence-to-chromatogram and chromatogram-to-sequence.
- Large references fail gracefully with clear limits.
- Results are reproducible with same parameters.

## Risks
- Algorithm choices impacting speed/accuracy tradeoffs.
- UI complexity for long-gap visualizations.

## Success metrics
- Median time from load to first mismatch inspection.
- Alignment completion rate for supported input sizes.
