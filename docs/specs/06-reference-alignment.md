# Differentiator Spec — Reference Alignment

## Outcome
Align one or more Sanger reads or contigs against a user-provided reference sequence inside the browser.

## Why this wins
Reference context is where trace review becomes biological interpretation. Alignment anchors the viewer around expected sequence, exon/feature context, and target loci.

## User value
- Paste or upload a reference FASTA and align current reads immediately.
- Navigate mismatches, insertions, and deletions relative to the reference.
- Review target-specific sequence with annotations in one workspace.

## Scope
### In
- Local reference FASTA import/paste
- Read-to-reference and contig-to-reference alignment
- Orientation detection
- Reference coordinate mapping and feature anchoring

### Out
- Whole-chromosome browsing
- Server-backed alignment indexes
- Multi-reference database search in v1

## UX
- Add a `Reference` panel with import/paste actions.
- Once aligned, show:
  - reference row above the trace/contig
  - coordinate ruler in reference coordinates
  - jump-to-difference navigation
  - optional feature overlays from imported GenBank-lite metadata later
- If alignment confidence is weak, show that explicitly and keep raw review available.

## Data model
- `ReferenceSequence`
  - id, name, sequence, optional feature metadata
- `ReferenceAlignment`
  - source id
  - orientation
  - aligned ranges
  - CIGAR-like operations
  - score/confidence

## Implementation shape
- Add a pure alignment engine module optimized for amplicon-scale sequences.
- Maintain dual coordinate systems: trace base index and reference position.
- Keep alignment artifacts out of parser types so import remains format-agnostic.

## Parallel-safe build slices
1. Reference import schema and storage.
2. Pairwise read-to-reference alignment engine.
3. Reference row and coordinate mapping UI.
4. Feature overlay integration and low-confidence handling.

## Acceptance
- Users can align a loaded trace or assembled contig to a pasted/uploaded reference.
- Reference coordinates remain stable while trimming or strand toggling.
- Alignment failures degrade cleanly back to raw trace review.
- Alignment state can be saved in session/permalink features.
