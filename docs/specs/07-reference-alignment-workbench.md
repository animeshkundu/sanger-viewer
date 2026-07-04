# Spec 07 — Reference alignment workbench

## Goal
Align a trace or contig to a user-supplied reference sequence so review can happen in biological coordinates rather than only raw read order.

## Why this is a differentiator
SnapGene-class workflows become possible once traces are anchored to a reference. That is the bridge from trace viewing to real interpretation.

## Current baseline
- The app already supports annotations, reverse-complement handling, and sequence-level exports.
- There is no reference import, reference coordinate system, or read-to-reference alignment view.

## User-facing outcome
- Users can load a reference FASTA/GenBank sequence.
- Any trace or contig can be aligned to the reference.
- The review UI shows:
  - reference coordinates
  - mismatches/indels
  - annotation features anchored to the reference
  - jump-to-position navigation

## Product requirements
1. Alignment must support both raw traces and assembled contigs.
2. The first implementation should target single-amplicon local alignment, not whole-genome search.
3. Reference annotations must remain visible when the user pans through the aligned read.
4. Alignment confidence and clipped ends must be explicit.
5. The feature must remain fully client-side.

## Proposed implementation shape
- Add `src/reference/referenceImport.ts` for FASTA/GenBank parsing and normalized reference models.
- Add `src/alignment/localAlign.ts` for deterministic local alignment with explicit scoring parameters.
- Add an alignment mode in the main viewer that overlays read and reference coordinate systems.
- Extend the existing annotation track so it can render reference-derived features in aligned space.

## Acceptance checks
- A trace aligned to a known reference lands at the expected coordinate range.
- Mismatches and gaps are rendered consistently across light/dark themes.
- Annotation clicks still focus the aligned region correctly.
- Failed alignments return a readable reason instead of empty UI.

## Non-goals
- BLAST/database search
- Whole-plasmid map editing
- Structural variant interpretation

## Parallel-safe PR boundary
This PR should stop at reference import plus alignment visualization. Variant calling, primer checks, and in-silico PCR belong in follow-on specs.
