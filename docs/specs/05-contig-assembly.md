# Differentiator Spec — Contig Assembly

## Outcome
Assemble forward and reverse Sanger reads into an editable contig with clear evidence at every disagreement.

## Why this wins
This is the jump from “viewer” to “browser-native finishing workspace.” Users should not need to leave the app to build a consensus from paired or tiled reads.

## User value
- Combine overlapping reads into one contig.
- Review disagreements with trace-backed evidence.
- Export consensus FASTA plus provenance of contributing traces.

## Scope
### In
- Pairwise overlap detection for Sanger-length reads
- Orientation-aware assembly of 2+ traces
- Gapless or lightly gapped contig model for v1
- Manual conflict resolution with provenance

### Out
- Whole-genome assembly
- Large indel graph assembly
- Multi-sample haplotype phasing

## UX
- Add `Assemble contig` when two or more traces are available.
- Show:
  - ordered member traces
  - overlap map
  - consensus row
  - disagreement list linked to trace views
- Conflicts should expose both base calls, quality, and chromatogram peaks before the user accepts an edit.

## Data model
- `ContigProject`
  - source slot ids
  - oriented sequences
  - overlap anchors
  - consensus sequence
  - conflict list
  - manual resolution history

## Implementation shape
- Introduce a pure assembly core separate from DOM components.
- Seed alignment from ungapped overlap scoring and existing reverse-complement support.
- Reuse current consensus export patterns, but attach source trace provenance.

## Parallel-safe build slices
1. Assembly project schema and overlap scoring.
2. Two-read contig builder and consensus integration.
3. Contig review UI with conflict navigation.
4. Manual resolution persistence and export.

## Acceptance
- Two overlapping reads can be assembled into one contig entirely client-side.
- Reverse-complemented mates assemble correctly.
- Every consensus conflict can be traced back to member evidence.
- Manual resolutions persist in session state and update exports.
