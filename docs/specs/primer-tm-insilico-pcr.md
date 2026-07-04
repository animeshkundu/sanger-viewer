# Spec: Primer tools, Tm, and in-silico PCR

## Goal
Add everyday molecular-biology utilities around the trace viewer so users can move from “what did I sequence?” to “what should I sequence next?” without leaving the browser workspace.

## Why this is a differentiator
- Legacy trace viewers usually stop at read inspection.
- SnapGene and Benchling feel sticky because primers and amplicons live next to sequence evidence.
- For Sanger-heavy labs, integrated primer checks are a higher-frequency win than exotic export formats.

## User outcomes
- A user can paste or import primer sequences and immediately see where they bind.
- The app computes practical primer stats and surfaces obvious issues before an order or PCR plan.
- Users can simulate an amplicon on a reference or contig and compare it to observed trace coverage.

## Scope
### In scope
- Primer list management for the current workspace.
- Per-primer metrics:
  - length
  - GC%
  - Wallace Tm and nearest-neighbor Tm
  - 3' GC clamp flag
  - simple hairpin/self-dimer risk heuristics
- Binding-site search on:
  - active trace sequence
  - contig consensus
  - imported reference
- Paired-primer in-silico PCR with product size, orientation, and mismatch summaries.
- Primer/amplicon annotation overlays in the viewer.

### Out of scope
- Full thermodynamic modeling parity with dedicated oligo design suites.
- Genome-wide off-target search against remote databases.
- Automated primer design in v1.

## UX
1. User opens a trace, contig, or reference-backed workspace.
2. User opens **Primers** and pastes one or more oligos.
3. App computes stats immediately and highlights binding sites.
4. When a forward/reverse pair is selected, the app shows expected amplicon coordinates and size.
5. If trace coverage overlaps the amplicon, the viewer highlights which observed bases confirm the product.

## Data model
```text
PrimerRecord
- id
- name
- sequence
- notes
- metrics
- bindings[]

AmpliconPrediction
- forwardPrimerId
- reversePrimerId
- templateId
- start
- end
- length
- mismatchSummary
```

## Technical approach
- Keep primer computation pure and synchronous for small primer sets.
- Use existing subsequence/revcomp helpers for binding search.
- Treat ambiguous template bases conservatively during binding evaluation.
- Show heuristic warnings with plain language; do not overclaim “good” or “bad” primers.
- Store primers as workspace-local objects so batch/session persistence can reuse them later.

## PR slices
1. Add primer metric engine and binding search tests.
2. Add primer manager UI and annotation overlays.
3. Add paired-primer amplicon prediction and coverage highlighting.
4. Add CSV/JSON export for primer tables and amplicon summaries.

## Acceptance criteria
- Primer stats are reproducible for the same sequence and settings.
- Binding hits respect strand and reverse-complement context.
- In-silico PCR only reports products with valid forward/reverse orientation.
- Amplicon predictions can be inspected against the trace/reference view, not just a table.

## Dependencies
- Reuses current search, revcomp, annotations, and future reference/contig surfaces.
- Remains fully client-side.
