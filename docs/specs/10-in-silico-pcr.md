# 10 — In-silico PCR

- Status: Proposed
- Build wave: D3
- Depends on: 08-primer-workbench.md, 09-tm-and-amplicon-readiness.md
- Enables: assay validation, clone screening, troubleshooting off-target products

## Goal
Simulate PCR products from selected primer pairs against the active reference so users can validate assay intent before leaving the workspace.

## Why this matters
In-silico PCR closes the loop between trace review and next-step experiment planning, making the browser app a working bench tool rather than only a viewer.

## User outcomes
- A user can pick a forward and reverse primer and see predicted amplicons.
- The app reports product size, coordinate span, and whether multiple products are possible.
- Clicking a predicted product focuses the corresponding reference region and trace evidence.

## Scope
- Search primer-pair hits on the active reference.
- Product listing with size, strand, coordinates, and simple confidence/warning state.
- Visualization of on-target and off-target products.
- Export of predicted products as tabular text and FASTA sequences.

## Simulation rules
- Require correct primer orientation for a valid product.
- Support multiple hits and report ambiguity instead of hiding it.
- Apply user-visible limits for maximum product length so performance stays predictable.

## UX requirements
- Off-target products are visually distinct from the primary product.
- Users can filter to exact-match-only versus mismatch-tolerant mode in a later iteration; exact-match-only ships first.
- Product selection syncs with reference coordinates and primer annotations.

## Acceptance criteria
- Exact-match primer pairs produce correct product spans on the active reference.
- Multi-hit primers surface all qualifying products within configured limits.
- Product visualization and export stay consistent with the reported coordinates.
- Automated tests cover no-hit, single-hit, and multi-hit scenarios.

## Non-goals
- Genome-wide PCR against remote databases.
- Degenerate-primer thermodynamic modeling in the first release.
