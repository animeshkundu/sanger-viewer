# Spec: Contig assembly

## Goal
Turn the current multi-trace workspace into a real assembly surface that can merge overlapping Sanger reads into an inspectable contig with disagreement review, quality-aware consensus, and exportable results.

## Why this is a differentiator
- Chromas explicitly pushes multi-read assembly into a separate paid product.
- Geneious and SnapGene earn trust because traces participate in consensus review, not just single-file viewing.
- `sanger-viewer` already has tabs, consensus, edits, and quality; contigs are the next step that makes the browser workspace feel complete.

## User outcomes
- A user can load forward/reverse reads for the same amplicon and get a proposed contig automatically.
- A reviewer can inspect disagreements base-by-base with chromatogram evidence from every contributing read.
- The contig consensus can be exported along with provenance for every placed read.

## Scope
### In scope
- A dedicated **Assemble Contig** action for 2+ loaded traces.
- Automatic overlap detection with strand/orientation inference.
- Read placement into a gapped contig coordinate system.
- Quality-aware consensus across placed reads.
- A contig lane that shows:
  - consensus sequence
  - mismatch/disagreement markers
  - per-read placement spans
  - insertion/deletion indicators
- Click-through review from any contig position to the contributing chromatogram evidence.
- Export of contig FASTA plus assembly JSON for round-tripping.

### Out of scope
- Whole-genome assembly.
- Polyploid/phasing workflows.
- External databases or cloud project storage.

## UX
1. User opens 2-24 traces.
2. User clicks **Assemble Contig**.
3. App proposes one or more contigs and shows unplaced reads separately.
4. User reviews an assembly board with consensus on top and contributing reads below.
5. Clicking a disagreement focuses the contributing traces at the aligned evidence position.
6. User can accept the contig, remove a read, flip a read orientation, or keep reads unplaced.

## Assembly model
```text
Assembly
- contigs[]
  - id
  - consensus
  - columns[]
  - reads[]
    - slotId
    - orientation
    - start
    - end
    - cigar-like placement ops
    - quality summary
- unplacedReads[]
```

## Technical approach
- Build from displayed sequence, not raw base-call strings, so trim/revcomp/manual edits stay truthful.
- Use overlap scoring seeded by exact k-mers and refined by banded alignment.
- Weight consensus by called base quality when qualities exist; fall back to equal voting when absent.
- Preserve a mapping from contig column → trace base index so every consensus position can open chromatogram evidence.
- Keep assembly logic pure and deterministic; UI consumes a serializable assembly result.

## PR slices
1. Add pure overlap/orientation detection and placement model with fixtures/tests.
2. Add consensus-on-contig logic and evidence index mapping.
3. Add assembly board UI with disagreement navigation.
4. Add export/import for assembly JSON and contig FASTA.

## Acceptance criteria
- Two overlapping forward/reverse reads assemble into one contig with correct orientation.
- Disagreement review always identifies which reads support each base.
- Assembly honors current trim state and displayed edits.
- Unplaceable reads remain visible and never disappear silently.

## Dependencies
- Builds directly on current workspace slots, quality data, edits, and consensus infrastructure.
- Reference alignment and variant calling remain separate so contig assembly can ship first.
