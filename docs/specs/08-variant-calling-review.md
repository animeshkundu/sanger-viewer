# 08 — Variant calling and review

**Status:** Proposed  
**Outcome:** After reference alignment, the workspace produces a reviewable list of candidate SNVs/indels with trace-backed evidence.

## Why this matters
The biological question is usually “what changed?” not just “what does the trace look like?” Variant review is the analysis layer that makes the viewer a true workspace.

## Scope
- Call candidate SNVs and small indels from an aligned trace or contig.
- Use base quality and ambiguity context to classify confidence.
- Provide a variant table synchronized with the trace/alignment view.
- Support export as CSV and VCF-lite JSON/TSV for downstream use.

## Non-goals
- No germline/ploidy model beyond simple heterozygous-like ambiguity support.
- No large indels or structural events in the first wave.
- No clinical interpretation layer.

## Calling rules
- Compare aligned subject bases against the reference base-by-base.
- Emit SNVs for high-confidence disagreements.
- Emit ambiguous calls separately when the evidence supports an IUPAC mixed base rather than a clean substitution.
- Emit small insertions/deletions from gap-bearing alignment segments with confidence labels.

## UX spec
- Add a **Variants** panel with columns: position, ref, alt, type, confidence, feature overlap, notes.
- Selecting a variant highlights the reference alignment and centers the chromatogram.
- Filters: `All`, `High confidence`, `Ambiguous`, `Indel`, `In feature`.
- Review actions: accept, mark uncertain, suppress from export.

## Data model
```ts
interface CalledVariant {
  id: string
  alignmentId: string
  position: number
  ref: string
  alt: string
  type: 'snv' | 'insertion' | 'deletion' | 'ambiguous'
  confidence: 'high' | 'medium' | 'low'
  featureIds: string[]
  review: 'unreviewed' | 'accepted' | 'uncertain' | 'suppressed'
}
```

## Implementation slice
- Variant derivation on top of the reference-alignment output.
- Table/filter UI that reuses existing list and selection patterns.
- Export helpers for CSV plus a simple structured interchange format.
- Tests split between calling logic and UI review workflow.

## Acceptance criteria
- An aligned trace/contig produces a deterministic candidate-variant list.
- Selecting a variant always reveals the underlying trace evidence.
- Review state is durable in sessions/permalinks where supported.
- Export omits suppressed calls and preserves review annotations.

## Validation plan
- Unit tests for SNV/indel/ambiguity derivation.
- Fixture-driven tests with known mismatch examples.
- E2E test for variant selection, filtering, review-status change, and export.
