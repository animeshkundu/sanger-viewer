# 09 — Primer and Tm analysis

## Goal
Make primer context first-class by letting users annotate primers against reads/references and immediately inspect basic thermodynamic fitness alongside trace evidence.

## Why this is a differentiator
Primer context is usually split across separate calculators and notebooks. Folding it into the trace workspace reduces tool switching and makes read interpretation more actionable.

## Current foundation
- Sequence search, annotations, reverse-complement, and reference alignment are already compatible building blocks.
- The app already renders synchronized annotation and inspector surfaces.

## User outcomes
- Paste one or more primer sequences and see where they bind.
- Review orientation, length, GC%, and Tm without leaving the trace view.
- Distinguish primer-derived low-quality regions from true downstream biology.

## In scope
- Primer import by paste/manual entry with optional naming.
- Binding-site detection on traces, contigs, and aligned references.
- Per-primer summary: sequence, length, GC%, Tm, orientation, and expected start/end coordinates.
- Optional annotation of primer-covered bases and primer-proximal low-confidence warning cues.

## UX specification
- Add a **Primers** panel with a primer list and add/remove actions.
- Selecting a primer highlights its binding site and centers the main view there.
- Primer badges should differentiate exact, near-exact, and missing matches.
- Tm output must clearly identify the calculation model used and avoid false precision.

## Technical shape
- Treat primers as named lightweight sequence annotations with derived metrics.
- Reuse search/alignment infrastructure for binding-site detection.
- Keep Tm calculation deterministic and documented so results are stable across sessions and exports.
- Persist primers with the workspace and reuse them in in-silico-PCR.

## Validation
- Unit tests for GC%, Tm, reverse-complement matching, and missing-site detection.
- Browser tests for primer add/remove, highlight/jump behavior, and persistence.
- Cross-feature tests ensuring primer annotations behave correctly under strand flips and reference alignment.

## Dependencies
- Independent for trace-local matching.
- Becomes more valuable with spec 07 and feeds spec 10.

## Non-goals
- Full primer design optimization.
- Secondary structure prediction beyond the initial Tm-focused scope.
- Claiming wet-lab success from browser-only calculations.
