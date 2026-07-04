# 06 — Reference alignment and coordinate map

- Status: Proposed
- Build wave: D2
- Depends on: none
- Enables: clone verification, amplicon confirmation, coordinate-aware review

## Goal
Align any trace or contig against a user-supplied reference sequence and present the review in reference coordinates.

## Why this matters
Users often care more about where a read lands on a plasmid or amplicon than about the raw trace alone. Reference context is the bridge from viewing to interpretation.

## User outcomes
- A user can paste or upload a FASTA reference.
- The app finds the best orientation, aligns the trace/contig, and reports start/end coordinates.
- Review panels use reference numbering and show insertions/deletions explicitly.

## Scope
- FASTA intake for one or more references.
- Per-trace best-hit selection with strand awareness.
- Alignment viewer with read coordinates, reference coordinates, mismatch markers, and uncovered regions.
- Reference feature overlay hooks for future plasmid/gene annotations.

## Alignment rules
- Support local alignment for partial reads.
- Reject weak hits rather than forcing dubious coordinate assignments.
- Keep raw trace coordinates available alongside reference coordinates.

## UX requirements
- Users can switch between trace-centric and reference-centric views.
- Coordinate jumps work from both the chromatogram and the alignment panel.
- Large references remain responsive via windowed rendering.

## Acceptance criteria
- Forward and reverse reads align to the correct strand automatically.
- Partial reads produce sensible local coordinate spans.
- Low-confidence alignments are surfaced as warnings, not silent successes.
- Automated tests cover orientation choice, local-hit boundaries, and coordinate mapping.

## Non-goals
- Whole-genome search across remote databases.
- Server-side sequence indexing.
