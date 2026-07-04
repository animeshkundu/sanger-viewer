# Differentiator Spec — In-silico PCR

## Outcome
Let users validate primer pairs against the active reference or contig and preview the expected amplicon before running the experiment.

## Why this wins
This closes the loop from trace review to next-step assay planning. Users can confirm primer orientation and product size without exporting sequence to another tool.

## User value
- Test whether a primer pair amplifies the intended target.
- See expected product size and coordinates immediately.
- Catch wrong orientation or multi-hit primer issues early.

## Scope
### In
- Search saved or pasted primer pairs against active reference/contig
- Exact and limited-mismatch matching rules
- Product prediction with coordinates and sequence export
- Warning states for zero-hit or multi-hit pairs

### Out
- Genome-wide search over very large references in v1
- Full secondary-structure simulation
- Wet-lab protocol optimization

## UX
- Add `Run in-silico PCR` from the primer workflow.
- Show per pair:
  - forward hit
  - reverse hit
  - product span
  - expected size
  - status (`single product`, `multiple products`, `no product`)
- Clicking a product opens the aligned region in the main viewer.

## Data model
- `PcrQuery`
  - primer pair id
  - target sequence id
  - mismatch tolerance
- `PcrProduct`
  - start/end
  - size
  - strand
  - sequence
  - confidence/warnings

## Implementation shape
- Reuse reference/contig sequence representations from earlier specs.
- Add a fast amplicon search module optimized for amplicon-scale inputs.
- Treat in-silico-PCR as an analysis layer, not a parser concern.

## Parallel-safe build slices
1. Primer-hit search and product prediction core.
2. Product results UI.
3. Viewer deep-linking from predicted products.
4. Export of product summary and sequence.

## Acceptance
- Saved primer pairs can be evaluated against the active reference or contig in-browser.
- Product predictions are deterministic for the same mismatch settings.
- Zero-hit and multi-hit outcomes are explicit and actionable.
- Predicted products can be opened in the main review context.
