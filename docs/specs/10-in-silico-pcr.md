# Spec 10 — In-silico PCR and amplicon verification

## Goal
Let users validate a primer pair against a loaded reference or contig and immediately see predicted amplicons, product size, and trace coverage relevance.

## Why this is a differentiator
This turns `sanger-viewer` from a review endpoint into a lightweight planning loop for the next wet-lab step.

## Current baseline
- Primer objects from Spec 09 and reference coordinates from Spec 07 provide the required foundation.
- The current app has no assay simulation or product-level verification.

## User-facing outcome
- Users pick two primers and run `Simulate PCR`.
- The app reports:
  - zero/one/multiple predicted amplicons
  - amplicon coordinates
  - product length
  - primer-binding mismatches
  - whether current trace/contig coverage spans the expected product

## Product requirements
1. Binding search must support both exact and bounded-mismatch matching.
2. The default workflow should target single-reference amplicon verification, not genome-wide ePCR at scale.
3. Multiple predicted products must be obvious and treated as a warning.
4. Product coordinates must link back to the reference/alignment view.
5. The simulation must remain fully client-side and fast on typical Sanger amplicon references.

## Proposed implementation shape
- Add `src/primers/inSilicoPcr.ts` for primer binding search, orientation checks, and product derivation.
- Add an amplicon result card or panel that can highlight the predicted product on the annotation/reference track.
- Reuse pinned manual primers and suggested primers from the primer workspace.
- Add product export as FASTA plus a minimal report summary.

## Acceptance checks
- Exact-match primers yield the expected single amplicon on a known reference.
- Off-target-compatible primer pairs report multiple products with warning state.
- A product click focuses the aligned/reference region correctly.
- Reverse-complement handling is correct for both primer orientations.

## Non-goals
- Whole-genome primer specificity against remote databases
- Lab protocol generation
- qPCR efficiency prediction

## Parallel-safe PR boundary
This PR should stay limited to primer-pair simulation and product visualization on already-loaded sequences. It should not include primer design itself or batch triage logic.
