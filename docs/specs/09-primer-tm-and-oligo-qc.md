# 09 — Primer Tm and oligo QC

## Summary
Add built-in primer quality checks so users can evaluate Tm, GC content, secondary-structure risk, and primer-pair compatibility without leaving the browser.

## Why this is a differentiator
Primer issues explain many poor Sanger reads and failed validation assays. Folding primer diagnostics into the same workspace shortens the loop between a bad trace and the next experimental decision.

## Current baseline
There is no primer thermodynamics or oligo validation feature in the app today.

## Goals
- Compute core primer QC metrics client-side.
- Compare primer pairs for compatibility.
- Present warnings in a way that helps wet-lab decisions.

## Non-goals
- No claim of full thermodynamic parity with specialist oligo packages.
- No exhaustive genome-wide specificity analysis in this wave.

## User workflows
1. User opens a primer from the primer workspace or pastes a new sequence.
2. App computes single-primer metrics and warnings.
3. User selects a forward and reverse primer pair.
4. App highlights Tm delta, GC balance, risky 3' complementarity, and probable assay problems.

## Spec
### Single-primer metrics
- length
- GC percent
- Wallace-style quick Tm for short primers
- nearest-neighbor Tm in the supported range
- 3' GC clamp indicator
- homopolymer and low-complexity warnings
- simple hairpin and self-dimer heuristics

### Pair metrics
- forward/reverse Tm delta
- heterodimer risk heuristic
- expected amplicon directionality on the chosen reference
- pair status: `good`, `review`, `poor`

### UX
- Metric cards with normal-range guidance.
- Warning list ordered by likely assay impact.
- Comparison mode for multiple primer candidates.
- Save QC snapshots into session notes or exports.

### Guardrails
- Show which formula family was used for Tm.
- Mark unsupported chemistries or salt assumptions clearly.
- Avoid false precision by rounding displayed temperatures sensibly.

## Acceptance criteria
- Single primers and primer pairs can be evaluated entirely client-side.
- The UI exposes both numeric metrics and actionable warnings.
- Pair QC can launch directly from the primer library.
- Saved sessions preserve computed QC summaries or can recompute them deterministically.

## Parallel build slices
1. Oligo metric engine.
2. Single-primer QC panel.
3. Pair comparison panel.
4. Session/export integration.

## Dependencies
- Best experienced with the primer workspace.
- Informs in-silico PCR and troubleshooting workflows.
