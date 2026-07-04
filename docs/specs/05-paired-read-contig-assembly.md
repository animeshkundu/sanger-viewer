# 05 — Paired-read contig assembly

**Status:** Proposed  
**Outcome:** Forward and reverse reads from the same amplicon assemble into one reviewable contig with a consensus sequence.

## Why this matters
This is the clearest “beyond viewer parity” upgrade over FinchTV/Chromas. Many real Sanger workflows end with “assemble F+R and decide the truth,” not “inspect one file.”

## Scope
- Pair reads manually or by filename heuristics.
- Orient reads automatically, overlap them, and build a consensus contig.
- Preserve per-read trace access alongside the assembled view.
- Support two-read MVP first; multi-read assembly can come later.

## Non-goals
- No de novo assembler for arbitrary read sets.
- No chromatogram signal re-alignment; consensus works from called bases plus qualities.
- No reference alignment in this spec.

## Assembly rules
- Use quality-trimmed sequences by default, with a toggle to include full reads.
- Test both strand orientations and choose the highest-scoring overlap.
- Score matches, mismatches, ambiguity compatibility, and gap penalties explicitly.
- Generate a consensus row that prefers higher-quality agreeing bases and emits IUPAC ambiguity when evidence conflicts materially.

## UX spec
- Add **Assemble pair** in the compare drawer.
- Show a contig view with rows for forward read, reverse read, and consensus.
- Provide coverage/overlap summary: overlap length, disagreement count, unresolved positions.
- Clicking any consensus base reveals the underlying per-read evidence.

## Data model
```ts
interface PairedContig {
  id: string
  readIds: [string, string]
  orientation: 'fr' | 'rf'
  overlapStart: number
  overlapEnd: number
  consensus: string
  support: Array<{
    consensusIndex: number
    forwardBase?: string
    reverseBase?: string
    forwardQ?: number | null
    reverseQ?: number | null
  }>
}
```

## Implementation slice
- New contig/overlap utilities under `src/consensus/`.
- Pairing heuristics in workspace/batch state.
- Consensus review surface reusing existing sequence/inspector patterns.
- Tests centered on deterministic overlap and consensus generation.

## Acceptance criteria
- A user can assemble a forward/reverse pair into one consensus contig.
- The chosen orientation and overlap are inspectable, not hidden.
- Disagreement counts are visible before manual review begins.
- Opening the source reads from the contig remains one click away.

## Validation plan
- Unit tests for overlap scoring and consensus generation.
- Fixture-driven tests with known F/R pairs.
- E2E test for pairing, assembly, contig open, and source-read drill-down.
