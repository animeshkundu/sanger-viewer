# 10 — In-silico PCR

**Status:** Proposed  
**Outcome:** Chosen primers can be tested against a reference or resolved contig in-browser to predict amplicons before leaving the workspace.

## Why this matters
This closes the loop: review traces, assemble/align them, design primers, and validate the expected amplicon in one browser-native session.

## Scope
- Run an in-silico PCR check from a selected primer pair against a reference record.
- Support linear and circular templates.
- Report predicted amplicon size, binding coordinates, and strand orientation.
- Allow export of the predicted amplicon as FASTA plus a simple report.

## Non-goals
- No degenerate exhaustive genome-wide search.
- No multiplex PCR optimization.
- No wet-lab condition modeling beyond basic binding constraints.

## Simulation rules
- Primer matching allows configurable mismatch tolerance outside the terminal 3' bases.
- The 3' end must satisfy stricter matching rules than the rest of the primer.
- Circular templates can yield wrap-around amplicons.
- If multiple plausible amplicons are found, rank by primer match quality and product size window.

## UX spec
- Add **Run in-silico PCR** from the primer workspace.
- Show predicted products in a ranked list with: size, start/end, forward primer site, reverse primer site, mismatch count.
- Selecting a product highlights the amplicon on the reference and exposes the product sequence.
- Zero-hit and multi-hit outcomes get explicit, actionable messaging.

## Data model
```ts
interface PredictedAmplicon {
  id: string
  referenceId: string
  forwardPrimerId: string
  reversePrimerId: string
  start: number
  end: number
  size: number
  circularWrap: boolean
  mismatches: { forward: number; reverse: number }
}
```

## Implementation slice
- Matching/simulation engine sharing reference utilities and primer candidates.
- Product list UI plus amplicon highlight layer.
- FASTA/report export for selected products.
- Tests for linear, circular, zero-hit, and multi-hit cases.

## Acceptance criteria
- A saved primer pair can be tested against the active reference in-browser.
- Product predictions are inspectable and reproducible.
- Circular-reference products are handled correctly.
- Zero-hit and multi-hit outcomes are explained without ambiguity.

## Validation plan
- Unit tests for primer binding and product generation.
- Fixture tests for linear/circular templates.
- E2E test for running PCR from a pinned primer pair and inspecting/exporting the result.
