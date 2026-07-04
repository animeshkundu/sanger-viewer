# 07 — Variant calling and review

- Status: Proposed
- Build wave: D3
- Depends on: 06-reference-alignment-and-coordinate-map.md
- Enables: mutation confirmation, clone QC, edit verification

## Goal
Call candidate variants from aligned traces or contigs and present them in a review workflow that keeps the chromatogram evidence front and center.

## Why this matters
Variant output is where a Sanger workspace becomes actionable. The differentiator is not just finding deltas, but making each call easy to trust or reject.

## User outcomes
- A user gets a variant table with substitutions, insertions, deletions, zygosity-style ambiguity, and confidence.
- Clicking a variant jumps to the aligned chromatogram evidence.
- The user can mark each variant as accepted, rejected, or needs-review and export the curated set.

## Scope
- Reference-delta generation from aligned reads and polished contigs.
- Call classification for SNVs, indels, and ambiguous mixed-base positions.
- Review table with filters for confidence, coding effect hook, and review state.
- Export to CSV/TSV and human-readable report text.

## Calling rules
- Distinguish trace noise from supported mixed-base evidence.
- Surface low-confidence calls explicitly instead of over-normalizing them.
- Keep manual overrides auditable.

## UX requirements
- Variant review state persists in sessions and permalinks.
- The table supports batch keyboard triage.
- A reviewer can compare source read calls before accepting a contig-derived variant.

## Acceptance criteria
- Variant coordinates match the active reference map.
- Mixed-base evidence can produce an ambiguity-style call when appropriate.
- Export preserves reviewer decisions and confidence annotations.
- Automated tests cover SNV, indel, ambiguity, and reviewer override cases.

## Non-goals
- Clinical-grade interpretation.
- Remote annotation services in the first release.
