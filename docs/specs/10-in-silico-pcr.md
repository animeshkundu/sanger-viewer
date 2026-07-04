# 10 — In-silico PCR

## Goal
Predict amplicons from primer pairs against a reference inside the same browser workspace so users can validate expected products before or while reviewing traces.

## Why this is a differentiator
This closes the loop between primer planning, expected amplicon structure, and actual Sanger evidence. Competitors often spread those steps across different modules or products.

## Current foundation
- Primer objects from spec 09 provide named forward/reverse candidates.
- Reference alignment from spec 07 provides coordinate-aware reference handling.
- The app already supports annotation lanes and export surfaces for compact result presentation.

## User outcomes
- Select a primer pair and see predicted amplicon(s).
- Inspect expected product size, orientation, and coordinates.
- Compare predicted amplicon regions against actual trace or contig evidence.

## In scope
- Primer-pair evaluation against a local reference sequence.
- Product prediction for exact or bounded-mismatch primer binding rules.
- Amplicon summary: size, coordinates, strand orientation, primer names, and off-target count.
- One-click promotion of the predicted amplicon region into reference-alignment and trace-review workflows.

## UX specification
- Add an **In-silico PCR** action from the Primers or Reference surfaces.
- Results should show a ranked list of predicted products with the primary product clearly identified.
- Selecting a product highlights the amplicon span on the reference and exposes export/copy actions for the expected sequence.
- When no product is found, explain whether the failure is due to missing sites, wrong orientation, or size constraints.

## Technical shape
- Use a bounded browser-side search model that is suitable for plasmid and targeted amplicon references.
- Keep product objects lightweight and serializable into sessions and permalinks.
- Preserve a clear distinction between predicted products and observed trace evidence.

## Validation
- Unit tests for orientation rules, size limits, mismatch bounds, and multi-hit handling.
- Browser tests for primer-pair selection, ranked product display, and handoff into reference review.
- Regression checks for persistence and export semantics.

## Dependencies
- Depends on spec 09 for primer definitions.
- Strongly coupled to spec 07 when a reference is required.

## Non-goals
- Genome-scale virtual PCR.
- Degenerate-primer search explosion in the first wave.
- Replacing dedicated primer-design suites.
