# 05 — Paired-read contig assembly

## Goal
Assemble forward and reverse Sanger reads into a browser-native contig so users can review one consensus object instead of mentally reconciling two separate traces.

## Why this is a differentiator
This is the line between “viewer” and “workspace.” FinchTV and Chromas stay mostly single-read; a clean contig flow is where sanger-viewer starts competing with heavier suites.

## Current foundation
- Reverse-complement support already exists.
- Multi-trace workspace already keeps more than one read open.
- Consensus generation and edit persistence already exist for single-read views.

## User outcomes
- Choose two reads and assemble them into one contig.
- See overlap confidence, disagreements, and consensus sequence immediately.
- Keep raw reads visible as evidence instead of flattening them into opaque output.

## In scope
- Paired-read assembly for typical forward/reverse Sanger reactions.
- Automatic orientation handling and overlap discovery.
- Quality-aware consensus generation across the overlap.
- Explicit representation of non-overlap overhangs and disagreement regions.

## UX specification
- Add **Assemble contig** from a compare/workspace surface when two compatible reads are selected.
- Result opens as a contig review view with:
  - top consensus row
  - read A and read B evidence rows
  - highlighted overlap window
  - conflict and low-confidence markers
- Users must be able to jump directly to disagreement positions.

## Technical shape
- Use a deterministic overlap-first assembly model sized for short Sanger reads.
- Require a configurable minimum overlap window and minimum overlap-confidence floor before auto-assembling, and score overlap with sequence agreement plus quality weighting rather than sequence identity alone.
- Preserve both source reads as first-class objects linked to the derived contig.
- Keep the derived contig serializable for snapshots, permalinks, and later reference alignment.

## Validation
- Fixture-driven unit tests for orientation handling, overlap detection, consensus calls, and edge cases with weak overlap.
- Browser tests for assembling from two workspace traces and navigating disagreement hotspots.
- Regression checks that source-read edits and trim settings flow predictably into assembly inputs.

## Dependencies
- Independent, though it benefits from session persistence and batch selection.

## Non-goals
- De novo multi-read assembly.
- Long-read or genome-scale assembly.
- Hidden auto-merging without visible evidence rows.
