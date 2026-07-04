# Spec 06 — Multi-read contig finishing

## Goal
Extend pair assembly into a finishing workspace where several traces can support one contig, with pileup-style review, confidence cues, and explicit conflict resolution.

## Why this is a differentiator
Desktop tools earn loyalty by helping users finish messy reads, not just view clean ones. This spec defines that finishing step in a browser-native way.

## Current baseline
- The product already has multi-trace state, per-base inspection, edits, and consensus display.
- Pair assembly from Spec 05 creates the first true contig object but does not solve multi-read support.

## User-facing outcome
- Users can add more reads to an existing contig.
- A finishing view shows:
  - contig consensus row
  - per-read pileup rows
  - conflict badges
  - coverage-by-position
  - unresolved positions queue
- Users can accept a consensus call, pin an ambiguous IUPAC code, or force a manual base with provenance.

## Product requirements
1. Each contig position must know which reads support it and at what quality.
2. Consensus rules must be deterministic and inspectable.
3. Unresolved positions must be easy to navigate one by one.
4. Contig edits must never overwrite raw trace data.
5. Performance must stay acceptable for small Sanger-scale read sets in-browser.

## Proposed implementation shape
- Add `src/assembly/contigModel.ts` for contig rows, support evidence, and edit overlays.
- Introduce a dedicated contig review component instead of overloading the existing single-row consensus UI.
- Reuse the current base inspector pattern to inspect contig support stacks.
- Add derived statuses: `resolved`, `ambiguous`, `low-support`, `manual`.

## Acceptance checks
- Adding or removing a read recomputes contig support deterministically.
- A user can jump from an unresolved contig base to each supporting trace position.
- Exported contig FASTA carries contig name and contributor metadata.
- Manual contig decisions are preserved in session bundles.

## Non-goals
- Whole-genome assembly
- Graph assembly visualization
- Automated biological interpretation of contig conflicts

## Parallel-safe PR boundary
This PR should build on contig objects and review flows only. It should not include reference alignment, primer picking, or batch dashboards.
