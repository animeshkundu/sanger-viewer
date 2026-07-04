# Spec 09 — Primer design and Tm workspace

## Goal
Help users move from “I found the sequence issue” to “here is the next sequencing/PCR primer to order” without leaving the browser workspace.

## Why this is a differentiator
Most trace viewers end at inspection. A browser-native workspace can close the loop into experiment planning.

## Current baseline
- The app already exposes sequence, reverse-complement views, annotations, and search.
- There is no primer object model, thermodynamic calculation, or oligo review surface.

## User-facing outcome
- Users can select a region from a trace, contig, or reference and ask for primer suggestions.
- The primer panel shows candidate primers with:
  - sequence
  - orientation
  - length
  - GC%
  - Tm
  - product direction
  - warning badges for homopolymers/hairpin-prone/simple repeat issues

## Product requirements
1. The first release must support review-quality candidate design, not a full Primer3 replacement.
2. Tm calculation must be explicit about the formula and assumptions used.
3. Primer candidates must be tied to the current sequence coordinate system.
4. Users must be able to pin manual primers and compare them to suggested ones.
5. Primer data must be session- and permalink-friendly.

## Proposed implementation shape
- Add `src/primers/primerModel.ts` and `src/primers/tm.ts`.
- Add simple rule-based candidate generation first:
  - selectable target window
  - primer length range
  - GC/Tm bounds
  - avoidance of terminal weak ends and long homopolymers
- Add a primer side panel with copy/export actions.

## Acceptance checks
- Candidate generation is deterministic for a fixed sequence and parameter set.
- Tm and GC values are reproducible and documented in the UI/spec.
- Pinned manual primers survive reload via session/permalink state.
- Primer coordinates remain correct after reverse-complement toggles.

## Non-goals
- Full secondary-structure simulation
- Vendor ordering integration
- Multiplex primer optimization

## Parallel-safe PR boundary
This PR should only add primer objects, candidate generation, and Tm display. In-silico PCR and variant-aware assay design stay separate.
