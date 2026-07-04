# Spec 08 — Variant calling and review

## Goal
Convert aligned trace evidence into a small-variant review workflow with clear evidence, confidence filters, and exportable calls.

## Why this is a differentiator
A preferred Sanger workspace should answer “is this variant real?” directly, not force users to infer it manually from a mismatch highlight.

## Current baseline
- Mixed-base calling already exists within a single read.
- Consensus and planned reference alignment provide the raw ingredients for variant review.
- No explicit variant object, confidence model, or export format exists yet.

## User-facing outcome
- After aligning a trace or contig to a reference, the app generates candidate SNV/short-indel calls.
- A variant panel lists position, ref, alt, zygosity-style interpretation, support traces, and review status.
- Clicking a variant jumps to the exact locus in the chromatogram/alignment view.

## Product requirements
1. Candidate calls must distinguish:
  - clean substitution
  - mixed/heterozygous-looking substitution
  - short insertion/deletion
2. Every call must expose the evidence path back to the supporting trace peaks.
3. Users must be able to mark calls as accepted, rejected, or uncertain.
4. Export must support a simple tabular format first; VCF can follow once representation is stable.
5. Low-confidence calls must default to review, not acceptance.

## Proposed implementation shape
- Add `src/variants/variantCalling.ts` for candidate derivation from aligned reads/contigs.
- Add `src/variants/variantReviewState.ts` for manual review status overlays.
- Surface calls in a filterable side panel with severity/status chips.
- Reuse existing mixed-base thresholds as one input signal, but not the full confidence model.

## Acceptance checks
- Known synthetic mismatch fixtures produce deterministic candidate calls.
- Reviewing a call updates session state without mutating the raw alignment result.
- The exported review table matches the visible accepted/rejected statuses.
- Clicking a call always focuses the correct aligned locus.

## Non-goals
- Clinical interpretation
- Database annotation
- Copy-number or structural variant detection

## Parallel-safe PR boundary
Keep this PR focused on candidate-call derivation and review UI on top of existing alignment results. Do not bundle reference import or primer features.
