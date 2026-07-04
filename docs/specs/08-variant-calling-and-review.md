# 08 — Variant calling and review

## Goal
Convert reference-aligned Sanger evidence into an explicit, reviewable variant list so users can move from “I think this peak changed” to a documented call set.

## Why this is a differentiator
Most lightweight trace viewers stop at visual inspection. A variant review layer creates a workflow bridge from chromatogram evidence to interpretable molecular findings.

## Current foundation
- Base qualities, mixed-base calling, base inspector, edits, and consensus already exist.
- Reference coordinate mapping from spec 07 provides the positional scaffold.

## User outcomes
- See SNV and indel candidates ranked by confidence.
- Review each candidate with aligned trace evidence and contextual metrics.
- Export a compact variant table for downstream reporting.

## In scope
- Candidate detection for mismatches and short indels relative to the aligned reference.
- Confidence states driven by agreement, local quality, overlap evidence, and manual review outcome.
- Review statuses: unreviewed, accepted, rejected, needs follow-up.
- Tabular export of called variants with coordinates and evidence summaries.

## UX specification
- Add a **Variants** panel after alignment succeeds.
- Default table columns: position, ref, alt, type, confidence, evidence source, review state.
- Selecting a row centers the trace/alignment on that site and opens detailed evidence.
- Mixed or uncertain sites should remain visually distinct from accepted hard calls.

## Technical shape
- Variant objects must store both algorithmic evidence and user review metadata.
- Keep detection conservative and trace-review-oriented rather than pretending to be a clinical caller.
- Reconcile manual base edits, contig overrides, and mixed-base evidence before candidate generation.

## Validation
- Fixture-driven unit tests for SNVs, small indels, mixed sites, and low-quality rejection behavior.
- Browser tests for candidate navigation, review state changes, and export.
- Regression tests confirming edits and consensus overrides propagate into the candidate list correctly.

## Dependencies
- Depends on spec 07.
- Benefits from spec 06 when contig curation is the variant input.

## Non-goals
- Clinical-grade interpretation.
- Complex structural variant calling.
- VCF completeness requirements beyond a pragmatic initial export.
