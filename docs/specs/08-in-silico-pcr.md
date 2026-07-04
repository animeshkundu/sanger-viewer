# 08 — In-Silico PCR Preview

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Users need a fast virtual check that chosen primers amplify expected regions before ordering or running PCR.

## Outcome
Given a reference and primer pair, users can preview predicted amplicons and mismatch warnings in-browser.

## Scope (build wave)
- Match forward/reverse primer candidates against reference.
- Support mismatch tolerance settings.
- Predict amplicon coordinates/size and orientation.
- Highlight off-target hits and ambiguous products.

## Non-goals
- Full genome off-target search in v1.
- Wet-lab yield prediction.

## UX
1. User selects/imports primer pair.
2. User runs **In-silico PCR** against selected reference.
3. App displays primary amplicon and any secondary hits.
4. User exports predicted product sequence(s).

## Data model
- `PcrRun`
  - `runId`, `referenceId`, `primerPairId`, `mismatchTolerance`
  - `products[]` (`start`, `end`, `size`, `strand`, `mismatches`)

## Acceptance criteria
- Primary amplicon is identified for perfect-match fixtures.
- Secondary/off-target hits are clearly labeled.
- Product coordinates link back to alignment/trace views.
- Run parameters are stored with result for reproducibility.

## Risks
- False confidence when reference is incomplete.
- Computational cost with many candidate bindings.

## Success metrics
- Time from primer selection to first PCR prediction.
- % runs with clear single-product outcome.
