# 09 — Tm and amplicon readiness

- Status: Proposed
- Build wave: D3
- Depends on: 08-primer-workbench.md
- Enables: go/no-go assay checks, troubleshooting, consistent primer review

## Goal
Give users a fast, transparent readiness check for sequencing/PCR primers based on melting temperature and simple amplicon heuristics.

## Why this matters
Biologists often leave a viewer to sanity-check primer behavior. Keeping those checks in one browser workspace lowers friction and speeds decisions.

## User outcomes
- A user can select one or two primers and immediately see Tm, GC%, length, terminal GC clamp, and mismatch warnings.
- Primer pairs get an estimated amplicon size and a simple readiness status.
- Calculations are transparent enough to trust and compare.

## Scope
- Tm calculation for single primers using a documented default model.
- Primer-pair readiness summary: orientation, product span, size range, and basic warning badges.
- User-adjustable chemistry presets later; fixed sane defaults first.

## Calculation contract
- Publish the exact formula/model used in the UI and docs.
- Mark out-of-range or unsupported inputs clearly.
- Keep readiness scoring interpretable rather than opaque.

## UX requirements
- Results update immediately when a primer changes.
- Warning badges explain the underlying rule.
- Calculations remain available offline.

## Acceptance criteria
- Tm and readiness outputs are deterministic for the same inputs.
- Unsupported bases or malformed primer definitions fail gracefully.
- Primer-pair summaries stay consistent with reference-coordinate orientation.
- Automated tests cover valid calculations, invalid inputs, and readiness badge rules.

## Non-goals
- Thermodynamic simulation of full reaction conditions.
- Vendor-specific chemistry tuning in the first release.
