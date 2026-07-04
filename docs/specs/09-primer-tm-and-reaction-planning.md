# Differentiator Spec — Primer Tm and Reaction Planning

## Outcome
Provide immediate thermal and reaction-planning guidance for designed or imported primers inside the same workspace.

## Why this wins
Primer sequences alone are not enough; scientists need to know whether a pair is practical. Folding Tm and reaction planning into the review loop reduces context switching.

## User value
- Compute Tm, GC %, amplicon size, and pair compatibility instantly.
- Compare multiple candidate primer pairs side by side.
- Get simple setup guidance for sequencing or PCR follow-up.

## Scope
### In
- Single-primer and primer-pair Tm calculations
- Salt/concentration parameter inputs with sensible defaults
- Pair comparison table
- Reaction-planning notes and export

### Out
- Full thermodynamic secondary-structure simulation
- Vendor-specific ordering workflows

## UX
- Add a `Primer metrics` pane connected to saved primer sets.
- Show:
  - Tm per primer
  - ΔTm for the pair
  - GC %
  - estimated amplicon size when a reference target exists
  - warning badges for poor balance
- Allow exporting a compact bench-ready summary.

## Data model
- `PrimerThermoSettings`
  - salt concentration
  - primer concentration
  - method version
- `PrimerMetrics`
  - primer id
  - tm
  - gcPercent
  - warnings

## Implementation shape
- Implement pure thermodynamic helpers with versioned settings.
- Store inputs alongside primer sets so reported values are reproducible.
- Expose metrics to both the primer list and in-silico-PCR workflows.

## Parallel-safe build slices
1. Thermo settings and calculation module.
2. Metrics UI for saved primer sets.
3. Pair comparison and warnings.
4. Bench-summary export.

## Acceptance
- Tm outputs are reproducible for the same primer sequence and settings.
- Users can compare multiple primer pairs without losing source context.
- Metrics and warnings persist across session restore.
- The module operates entirely client-side.
