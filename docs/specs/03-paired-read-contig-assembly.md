# 03 — Paired-read contig assembly

## Goal
Assemble forward and reverse Sanger reads into a single contig inside the browser, with no external desktop tool.

## Why this wins
Most users leave a viewer when they need to reconcile paired reads. Bringing assembly into the same workspace removes the biggest parity gap with desktop incumbents.

## User outcomes
- A user can choose two traces and assemble them into one contig.
- The viewer shows overlap length, percent identity, and unaligned overhangs.
- Users can switch between contig consensus view and source-read evidence view.

## In scope
- Two-read assembly flow for forward/reverse traces.
- Automatic reverse-complement evaluation.
- Seed-and-extend overlap detection for expected amplicon-scale reads.
- Contig summary banner with assembly confidence signals.

## Out of scope
- Long-read assembly.
- De novo assembly of large read sets.
- Primer walking graph assembly.

## Product behavior
1. Add an `Assemble contig` action when at least two resident traces are loaded.
2. Let the user pick read order manually or accept automatic orientation.
3. Compute candidate overlaps across both strand orientations and choose the best-scoring legal assembly.
4. Show overlap metrics, disagreement count, and low-confidence edge zones before the user commits the contig.
5. After assembly, create a derived contig entity that can be viewed, exported, and reopened like a trace-derived asset.

## Data contract
- Source trace ids.
- Chosen orientations.
- Overlap interval and score.
- Consensus sequence plus per-position evidence summary.
- Flags for no-overlap, weak-overlap, or conflicting-overlap outcomes.

## Delivery notes
- Keep assembly logic DOM-free and fixture-driven.
- Limit scope to amplicon-sized traces so performance stays predictable in the browser.
- Preserve the original reads as first-class evidence, not disposable inputs.

## Acceptance criteria
- Two compatible reads can assemble into a derived contig with deterministic results.
- Reverse-complement handling is automatic but inspectable.
- Failed assemblies explain why they failed and keep the original traces untouched.
- Derived contigs remain client-side and exportable.

## Dependencies
- Reuses existing multi-trace workspace concepts.
