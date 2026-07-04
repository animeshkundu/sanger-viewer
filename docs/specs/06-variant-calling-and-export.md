# 06 — Variant calling and export

## Goal
Convert reference-aware mismatches into a lightweight variant review and export flow suited to Sanger confirmation work.

## Why this wins
Biologists do not just want to see a mismatch; they want a candidate variant with evidence, confidence, and an export they can drop into downstream records.

## User outcomes
- A user can see candidate SNVs and indels generated from an aligned trace or contig.
- Each call includes reference coordinate, allele, zygosity hint, and evidence links back to the chromatogram.
- Users can export a concise variant table for reporting or follow-up.

## In scope
- Candidate variant extraction from pairwise alignment.
- Heuristics for homozygous, mixed, and ambiguous calls using existing peak-ratio signals where available.
- Review list with filters for pass/review/fail.
- TSV/CSV export and future JSON export.

## Out of scope
- Clinical annotation.
- Population databases.
- Structural variant analysis.

## Product behavior
1. Add a `Variants` panel after reference alignment completes.
2. Generate candidate calls for substitutions, insertions, and deletions within aligned regions.
3. Link each variant row to a focused chromatogram view and the aligned reference context.
4. Allow a user to change review status and attach an optional note.
5. Export only reviewed fields and explicitly label heuristic confidence outputs.

## Data contract
- Variant id, reference coordinate, ref allele, alt allele.
- Call type, review status, and optional note.
- Evidence summary: peak ratio, local quality, supporting read count, contig provenance.

## Delivery notes
- Keep calling deterministic and intentionally conservative.
- Separate raw candidate generation from user review state.
- Design exports so later session bundles can include them unchanged.

## Acceptance criteria
- Aligned reads/contigs produce a reviewable list of candidate variants.
- Variant navigation round-trips cleanly to the chromatogram and reference context.
- Exported tables reflect manual review state.
- The feature remains explicit about heuristic limits and stays client-side.

## Dependencies
- Builds on `05-reference-alignment.md` and can consume contigs from `03-paired-read-contig-assembly.md`.
