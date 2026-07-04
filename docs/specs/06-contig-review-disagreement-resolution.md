# 06 — Contig review and disagreement resolution

**Status:** Proposed  
**Outcome:** Users can move through contig disagreements one by one and leave the assembly with an auditable resolved consensus.

## Why this matters
Assembly is only half the job. The differentiator is an explicit review loop that makes disagreements fast to inspect and safe to resolve.

## Scope
- Navigator for mismatches, low-confidence positions, and uncovered ends.
- Side-by-side evidence view for both traces plus consensus.
- Manual resolution controls with undo/redo and provenance.
- Exportable resolved consensus plus a machine-readable review log.

## Non-goals
- No multi-user comments.
- No automatic re-assembly after every manual resolution.
- No variant calling against an external reference; this is contig-internal review.

## UX spec
- Add a disagreement sidebar with counts by class: `Mismatch`, `Ambiguous`, `Low quality`, `Single-read coverage`.
- `Next issue` / `Previous issue` drive the viewport.
- Resolution controls: keep forward, keep reverse, set explicit base, keep ambiguity, mark unresolved.
- Every manual resolution creates a visible review record with timestamp and action.

## Data model
```ts
interface ContigReviewDecision {
  contigId: string
  consensusIndex: number
  issue: 'mismatch' | 'ambiguous' | 'low-quality' | 'single-coverage'
  action: 'keep-forward' | 'keep-reverse' | 'set-base' | 'keep-ambiguity' | 'mark-unresolved'
  value?: string
}
```

## Implementation slice
- Derive disagreement issues from contig support arrays.
- Reuse the existing edit model semantics so manual consensus edits stay non-destructive.
- Add export support for resolved consensus plus review-log JSON.
- Keep the issue navigator independent from reference-alignment review.

## Acceptance criteria
- A contig exposes a finite, navigable issue list.
- Applying a decision updates the resolved consensus without destroying raw evidence.
- Undo/redo work for review decisions.
- Export includes enough provenance to explain how the final consensus was reached.

## Validation plan
- Unit tests for issue classification and decision application.
- E2E test covering issue navigation and decision undo/redo.
- Manual verification on a contig with multiple disagreement classes.
