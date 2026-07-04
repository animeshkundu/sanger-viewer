# 04 — Paired-Read Contig Assembly

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Forward/reverse trace reconciliation is central to Sanger workflows; manual side-by-side comparison is slow and error-prone.

## Outcome
Users can assemble paired reads into a contig with confidence cues and explicit conflict handling.

## Scope (build wave)
- Pair candidate detection (filename conventions + manual pairing).
- Reverse-complement normalization and overlap discovery.
- Consensus contig generation with quality-weighted base selection.
- Conflict panel listing mismatches and low-confidence joins.

## Non-goals
- Multi-fragment scaffold assembly in v1.
- De novo assembly beyond paired reads.

## UX
1. User selects two traces as a pair.
2. App computes overlap and displays aligned lanes.
3. User reviews conflict list and applies manual overrides.
4. App exports contig sequence + audit trail.

## Data model
- `ReadPair`
  - `forwardTraceId`, `reverseTraceId`
  - `orientation`, `overlapRegion`
- `ContigResult`
  - `consensusSequence`
  - `perBaseConfidence[]`
  - `conflicts[]`
  - `manualOverrides[]`

## Acceptance criteria
- Known fixture pairs produce deterministic consensus output.
- Conflict list links directly to chromatogram positions.
- Manual overrides persist through recomputation.
- Export includes provenance (source traces + parameters).

## Risks
- Ambiguous overlaps on low-quality reads.
- Performance regressions on long traces.

## Success metrics
- % pairs assembled without manual conflict edits.
- Mean conflict resolution time.
