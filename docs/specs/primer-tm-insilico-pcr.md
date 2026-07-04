# Primer design, Tm, and in-silico PCR

## Why this matters

A browser-native Sanger workspace becomes much more valuable when it helps users move from “what did I sequence?” to “what should I amplify or confirm next?” without opening separate primer calculators and PCR tools.

## Product outcome

Add a lightweight primer workbench that evaluates candidate primers against the current reference/consensus, calculates practical oligo metrics, predicts amplicons, and feeds that context back into trace review.

## Scope

### In scope

- Candidate primer entry and simple primer picking from a selected region.
- Oligo metrics: length, GC%, estimated Tm, terminal GC clamp, homopolymer warnings, simple self-complement warning.
- In-silico PCR against the loaded reference sequence.
- Amplicon visualization tied to reference and trace alignment views.
- Export of primer table and predicted amplicon summary.

### Out of scope

- Full thermodynamic secondary-structure simulation.
- Genome-wide off-target search.
- Wet-lab protocol generation.

## Primary user workflows

1. A user aligns a trace/contig to a plasmid or amplicon reference.
2. The user opens **Primer tools**, selects a region, and inspects suggested or manually entered primers.
3. The app shows Tm/GC/basic quality warnings and predicts one or more amplicons.
4. The user chooses a primer pair, sees its expected product on the reference, and exports the plan.

## UX specification

### Entry points

- Compare drawer action: **Primer tools**
- Context action when a reference region is selected: **Design primers here**

### Primer workbench layout

- Left: selected reference region / primer pair list
- Center: reference map with primer arrows and predicted amplicon spans
- Right panel:
  - primer sequence
  - orientation
  - length
  - GC%
  - estimated Tm
  - warning badges
  - predicted product size

### States

- **Candidate**: meets default heuristics.
- **Warning**: acceptable but has notable issues.
- **Reject**: fails hard constraints.

## Data and algorithm model

### Primer evaluation

- Use deterministic client-side heuristics suitable for common lab screening:
  - configurable primer length window
  - GC% range
  - simple nearest-neighbor or documented simplified Tm estimate
  - homopolymer/repeat checks
  - terminal clamp checks
  - simple self-complement/hairpin risk heuristics

### In-silico PCR

- Search reference for forward and reverse primer binding sites with configurable mismatch tolerance.
- Report zero, one, or multiple products.
- Rank products by expected specificity and size suitability.

### Integration with trace review

- When a trace is already aligned to the same reference, show whether the read supports the primer-binding region and whether called variants touch primer sites.

## Implementation shape

### Slice 1 — Primer metrics engine

- Add reusable primer evaluation utilities and result types.

### Slice 2 — Binding-site search and PCR prediction

- Implement primer-site matching and product enumeration against the loaded reference.

### Slice 3 — Primer workbench UI

- Add primer entry, candidate list, warnings, and reference visualization.

### Slice 4 — Trace integration and export

- Show primer-site overlap with variants/edits and export primer plan summaries.

## Validation requirements

- Metric calculations are deterministic and documented.
- Multi-hit primers are flagged clearly.
- Predicted products update immediately when primer sequences or mismatch tolerance change.
- Primer-site variant overlap is surfaced when reference verification data exists.

## Acceptance criteria

- A user can evaluate primers and predict amplicons entirely in the browser against the active reference.
- The UI communicates suitability and risk clearly enough for everyday lab planning.
- Primer/amplicon context connects back to variant and trace review instead of living in isolation.
- Outputs are exportable and restorable through session state.

## Non-goals and risks

- This should guide routine design decisions, not replace specialized thermodynamic software for difficult assays.
- Tm and structure heuristics must be clearly labeled with their method and limits.
- Off-target analysis is intentionally narrow unless broader searchable reference support is added later.
