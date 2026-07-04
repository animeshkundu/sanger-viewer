# 07 — Primer Design + Tm Assistant

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Scientists often leave the viewer to design confirmatory primers, breaking context and increasing copy/paste errors.

## Outcome
Primer suggestions and Tm/GC checks are available directly from selected regions in the same workspace.

## Scope (build wave)
- Region-based primer candidate generation.
- Tm, GC%, length, and basic secondary-structure heuristics.
- Constraint controls (product window, Tm range, GC range, clamp preference).
- Primer table with rank/exclude rationale.

## Non-goals
- Full thermodynamic simulation in v1.
- Wet-lab protocol recommendation.

## UX
1. User selects target region.
2. User opens **Primer Assistant** and sets constraints.
3. App returns ranked primer pairs with metrics.
4. User pins selected pair into session.

## Data model
- `PrimerCandidate` (`sequence`, `start`, `length`, `tm`, `gcPct`, `flags[]`)
- `PrimerPair` (`forward`, `reverse`, `ampliconSize`, `rankScore`)

## Acceptance criteria
- Candidate list updates when constraints change.
- Each primer shows pass/fail reasons for constraints.
- Selected primer pairs persist in session snapshots/permalinks.
- Export of selected primers as CSV/TSV works.

## Risks
- Oversimplified Tm model expectations.
- Performance when scanning long references.

## Success metrics
- % sessions producing at least one pinned primer pair.
- Primer acceptance rate after first suggestion pass.
