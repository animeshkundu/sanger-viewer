# Differentiator spec — Primer, Tm, and in-silico PCR workspace

## Why this matters

A browser-native Sanger workspace becomes much stickier if users can move from trace review back to assay design without switching tools. Primer checks and virtual amplicon previews are a practical differentiator for validation and troubleshooting workflows.

## Product outcome

Users can enter or import primer pairs, calculate Tm and GC metrics, check orientation and expected amplicon span against a reference, and see whether the observed trace coverage matches the intended assay.

## Non-goals

- Full primer design optimization across entire genomes
- Wet-lab protocol generation
- Off-target search against external online databases

## User stories

- As a scientist, I can verify that my primer pair matches the intended region before trusting a trace.
- As a troubleshooter, I can see when poor trace coverage is consistent with a weak or off-target primer.
- As a reviewer, I can keep primer metadata attached to the sample session and exports.

## Scope

### In scope

- Primer entry/import for forward and reverse primers
- Tm, GC%, homopolymer, and simple self-complement heuristics
- In-silico PCR against a user-provided reference or imported FASTA panel
- Expected amplicon overlay on aligned/reference views
- Primer metadata persistence in session state

### Out of scope

- Automated primer picking from arbitrary templates
- Exhaustive genome-scale specificity search
- Degenerate-primer optimization

## UX

### Main surfaces

- `Primer workspace` panel with primer list, metrics, and assay status
- `Check assay` action once a reference is present
- Amplicon overlay on the reference coordinate view
- Warnings for mismatched orientation, multiple hits, weak Tm, or missing expected coverage

### Key interactions

- Paste a primer pair or import a CSV of assay definitions.
- Select which assay belongs to the current sample or batch subset.
- Click an amplicon hit to highlight the covered region in the reference-alignment view.

## Functional requirements

### Primer metrics

Calculate at minimum:

- length
- GC%
- Wallace-rule fallback Tm
- nearest-neighbor Tm for standard DNA conditions
- 3′ GC clamp flag
- simple hairpin/self-dimer risk heuristics

### In-silico PCR

- Search both strands of the selected reference or FASTA panel.
- Identify primer hits with configurable mismatch tolerance.
- Report zero-hit, single-hit, and multi-hit outcomes.
- Emit predicted amplicon length and interval when a valid primer pair is found.

### Trace integration

- When reference alignment exists, compare trace coverage against the predicted amplicon.
- Show whether the trace starts and ends near expected primer boundaries.
- Carry primer names and assay ids into exports and share/session payloads.

## Technical approach

### Data model

Add assay records containing:

- assay id and display name
- forward and reverse primer sequences
- metric summary
- hit list and chosen amplicon
- sample/session associations

### Algorithms

1. Normalize primer input and validate IUPAC DNA characters.
2. Compute Tm and GC metrics.
3. Search candidate primer hits on both strands of the selected reference set.
4. Pair compatible forward/reverse hits into predicted amplicons.
5. Surface assay warnings and trace-coverage comparisons.

## Parallel-safe implementation slices

1. Add primer schema and metric calculators.
2. Add in-silico PCR core over local FASTA/reference inputs.
3. Add primer workspace UI and assay import/export.
4. Add overlays and linkage into reference-alignment views.
5. Add fixtures for valid, weak, and off-target assays.

## Acceptance criteria

- Users can calculate primer metrics entirely client-side.
- In-silico PCR identifies expected amplicons from local reference inputs.
- Assay warnings explain why a primer pair is weak, off-target, or ambiguous.
- Primer metadata persists in session/share exports and links to trace review.

## Validation

- Unit tests for Tm and GC calculations
- Search tests for strand handling, mismatch tolerance, and multi-hit cases
- UI tests for assay selection and amplicon highlighting
