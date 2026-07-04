# 05 — Reference alignment

## Goal
Align a trace or assembled contig against a user-supplied reference sequence and make the alignment the primary review frame.

## Why this wins
Desktop viewers typically stop at raw trace inspection. Reference-aware review turns the app into a genuine analysis workspace for validation sequencing.

## User outcomes
- A user can paste or upload a reference FASTA and align the active trace or contig to it.
- The viewer can navigate by reference coordinate, not only by trace base index.
- Insertions, deletions, and soft-confidence regions are clearly marked.

## In scope
- Reference FASTA input and validation.
- Local pairwise alignment tuned for short amplicon reads.
- Coordinate mapping between trace space and reference space.
- Alignment summary with identity, coverage, and gap counts.

## Out of scope
- Genome-scale alignment.
- Remote reference fetching.
- Multi-reference project management.

## Product behavior
1. Add an `Align to reference` flow that accepts pasted sequence or local FASTA.
2. Run alignment client-side and cache results within the active browser session.
3. Introduce a reference ruler and alignment row above the chromatogram/consensus display.
4. Let users jump to the next mismatch, insertion, or deletion.
5. Show partial-alignment warnings when read ends or low-quality regions reduce confidence.

## Data contract
- Reference id, title, and sequence digest.
- Alignment CIGAR-like representation or equivalent normalized edit script.
- Per-position mapping between read index and reference coordinate.
- Summary metrics for coverage and identity.

## Delivery notes
- Keep the aligner modular so future variant calling can consume the same alignment object.
- Use worker execution for heavier alignments to preserve UI responsiveness.
- Make sure base-path deployment and client-only hosting remain unaffected.

## Acceptance criteria
- Users can align an active trace or contig to a local reference sequence.
- The viewer exposes both read-space and reference-space navigation.
- Alignment failure states are explicit and non-destructive.
- Alignment artifacts remain browser-local.

## Dependencies
- Independent, but contigs from `03-paired-read-contig-assembly.md` should also be valid inputs.
