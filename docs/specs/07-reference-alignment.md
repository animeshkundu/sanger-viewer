# 07 — Reference alignment workbench

## Goal
Align a trace or contig against a reference sequence in-browser so users can review base calls in biological coordinate space instead of raw read space alone.

## Why this is a differentiator
Reference-aware review is a major leap beyond basic viewers and unlocks variant calling, primer context, and amplicon-aware QC without leaving the browser.

## Current foundation
- Sequence search, annotations, reverse-complement, and consensus flows already exist.
- The app is already comfortable rendering synchronized linear evidence tracks.

## User outcomes
- Load or paste a reference and align a read/contig to it.
- Jump between trace evidence and reference coordinates.
- See mismatches, indels, uncovered regions, and orientation explicitly.

## In scope
- Reference import via FASTA paste/upload and reuse from prior session objects.
- Semi-global/local alignment suited to Sanger read-vs-reference review.
- Coordinate mapping between trace bases and reference positions.
- Alignment summary: identity, coverage, strand, clipped ends, and notable disagreement count.

## UX specification
- Add **Align to reference** from compare/analysis surfaces.
- Alignment result should render:
  - reference row
  - trace/contig row
  - mismatch/indel markers
  - optional annotation lane in reference coordinates
- Side panel should show alignment quality summary and jump actions for differences.
- Failed or low-confidence alignments must explain why and offer orientation retry.

## Technical shape
- Use semi-global alignment as the default mode for trace/contig vs reference review so clipped read ends stay explicit, with local alignment reserved for explicit rescue/low-overlap workflows.
- Preserve original read coordinates and expose a reversible mapping to reference coordinates.
- Treat the reference as an imported local artifact unless it is a known public URL source.
- Make the alignment object reusable by variant, primer, and in-silico-PCR features.

## Validation
- Unit tests for coordinate mapping, orientation selection, clipping, and indel placement.
- Browser tests for upload/paste reference flows and synchronized navigation across rows.
- Edge-case coverage for short overlaps, ambiguous bases, and repetitive regions.

## Dependencies
- Independent, but contigs from spec 05 should be valid alignment inputs.

## Non-goals
- Whole-genome alignment.
- Multiple-sequence alignment.
- Cloud reference databases in the initial wave.
