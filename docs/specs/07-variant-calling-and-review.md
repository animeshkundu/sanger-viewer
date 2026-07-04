# Differentiator Spec — Variant Calling and Review

## Outcome
Turn aligned reads into explicit variant candidates with evidence-first review instead of forcing users to infer calls manually.

## Why this wins
Most Sanger viewers stop at visual inspection. A browser-native evidence panel for substitutions and small indels makes the tool decisively better for confirmation workflows.

## User value
- See candidate SNVs and small indels relative to the chosen reference.
- Distinguish clear calls, mixed calls, and low-confidence positions.
- Approve or reject calls with supporting chromatogram context.

## Scope
### In
- Candidate generation from read/reference or contig/reference alignments
- Confidence tiers using base quality, peak ratios, and local context
- Mixed-base-aware heterozygous candidate display
- Export of reviewed calls as CSV and lightweight VCF

### Out
- Somatic subclonal modeling
- Structural variant calling
- Clinical interpretation

## UX
- Add a `Variants` panel listing:
  - reference coordinate
  - ref/alt
  - zygosity hint (`clear`, `mixed`, `uncertain`)
  - confidence
  - review status
- Clicking a variant recenters the trace and highlights supporting peaks.
- Rejected calls stay visible but clearly marked for auditability.

## Data model
- `VariantCandidate`
  - source alignment id
  - coordinate
  - ref, alt
  - event type
  - quality evidence
  - mixed-base evidence
  - review decision

## Implementation shape
- Build on reference-alignment outputs rather than directly on raw parser data.
- Reuse existing mixed-base calling as one evidence channel, not the only caller.
- Keep call generation pure and deterministic so tests can be fixture-driven.

## Parallel-safe build slices
1. Variant candidate schema and call heuristics.
2. Variant review panel.
3. Review decision persistence and export.
4. Mixed-call visualization in the chromatogram and consensus views.

## Acceptance
- Aligned traces yield a reproducible list of candidate SNVs and small indels.
- Mixed-base positions can surface as heterozygous-style candidates when evidence supports them.
- Users can mark calls approved/rejected/uncertain without losing raw evidence.
- Exported call tables reflect review decisions and source provenance.
