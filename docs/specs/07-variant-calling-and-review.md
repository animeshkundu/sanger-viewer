# 07 — Variant calling and review

## Summary
Add a reference-based variant workflow that proposes SNVs and indels from aligned traces or contigs, ranks call confidence, and keeps human review tied to chromatogram evidence.

## Why this is a differentiator
Biologists care about the decision, not just the alignment. A browser-native workspace becomes meaningfully better than a passive viewer when it can turn alignment differences into a reviewable call set.

## Current baseline
The app can call mixed bases from raw signal and supports manual editing, but there is no reference-aware variant model or review surface.

## Goals
- Generate candidate SNVs and indels from aligned source data.
- Use chromatogram-derived evidence to score calls.
- Support explicit review states and export.

## Non-goals
- No clinical interpretation layer.
- No copy-number or structural variant calling.
- No unsupported claims about zygosity beyond what the signal model can justify.

## User workflows
1. User aligns a trace or contig to a reference.
2. App lists candidate variants with confidence and evidence summaries.
3. User reviews each candidate against the raw trace.
4. User marks calls as accepted, rejected, or uncertain.
5. User exports the final call set for reporting.

## Spec
### Call types
- substitution
- deletion
- insertion
- mixed-base substitution candidate

### Variant record
- `variantId`
- `alignmentId`
- `referencePosition`
- `ref`
- `alt`
- `type`
- `supportingTraceIds[]`
- `qualitySignals`
- `reviewState`: `proposed | accepted | rejected | uncertain`
- `reviewNote`

### Evidence model
- Base-call agreement or disagreement.
- Mixed-base ratio at the site and neighboring context.
- Distance from trimmed ends.
- Local alignment quality and indel neighborhood complexity.
- For contigs, whether both reads support the same event.

### UX
- Variant table with filters by review state, type, and confidence.
- A site inspector that synchronizes reference coordinates, trace position, and chromatogram evidence.
- Side-by-side comparison for paired-read or contig-backed calls.
- Explicit badges for low-confidence edge calls.

### Output
- CSV export for all call fields.
- Simple VCF-like export for SNVs and small indels where representation is unambiguous.
- Reviewer summary for accepted and rejected calls.

## Acceptance criteria
- Aligned sources produce a candidate variant table entirely client-side.
- Every proposed call links back to visible trace evidence.
- Review state changes persist in sessions and bundles.
- Ambiguous calls remain representable as uncertain instead of being forced into pass/fail.
- Export reflects the reviewer-approved state.

## Parallel build slices
1. Variant model and caller.
2. Review table and site inspector.
3. Export formats.
4. Contig-aware evidence merge.

## Dependencies
- Requires reference alignment.
- Gets stronger when contig assembly is available.
