# 08 — In-silico PCR

## Goal
Predict amplicons from a primer pair against an active reference or contig so the user can validate expected product structure before interpreting the trace.

## Why this wins
This closes the loop between assay intent and sequencing evidence, which is something desktop trace viewers typically do not handle well.

## User outcomes
- A user can choose two primers and predict the expected amplicon.
- The app shows product size, orientation, primer coordinates, and whether the current trace/contig should overlap the predicted product.
- Users can flag off-target or multi-product outcomes before trusting a read.

## In scope
- Primer-pair selection from the primer workbench.
- Single-target in-silico PCR over the active reference/contig.
- Product summary cards with expected size and coordinates.
- Overlay of predicted amplicon on the existing annotation/navigation system.

## Out of scope
- Whole-genome PCR search.
- Degenerate-primer combinatorial expansion.
- Thermodynamic simulation of cycling conditions.

## Product behavior
1. Add a `Predict amplicon` action once at least two primers exist.
2. Identify valid forward/reverse primer pairings and enumerate products within configurable size bounds.
3. Surface the best-supported product first and clearly list secondary products.
4. Let users jump from a product card to the amplified interval in the viewer.
5. Show a mismatch warning when the current Sanger read does not plausibly cover the predicted product.

## Data contract
- Product id, left/right primer ids, target coordinates.
- Expected amplicon sequence and length.
- Warning flags for multiple products, oversized products, or weak primer matches.

## Delivery notes
- Build on primer hit objects instead of rescanning sequence from scratch.
- Keep product enumeration bounded for responsive browser execution.
- Make product output exportable for later session bundles.

## Acceptance criteria
- Users can generate predicted amplicons from local primer definitions.
- Product navigation integrates with existing viewer controls and annotations.
- Multi-product and no-product outcomes are explicit.
- The feature stays browser-only.

## Dependencies
- Builds on `07-primer-tm-workbench.md`.
