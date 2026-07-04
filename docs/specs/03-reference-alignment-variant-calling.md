# Differentiator spec — Reference alignment and variant calling

## Why this matters

Desktop trace viewers often stop at visual inspection. sanger-viewer can become more useful by turning that inspection into reference-aware evidence: aligned reads, annotated variants, and reviewable calls that stay tied to the chromatogram.

## Product outcome

Users can load a reference sequence, align one or more Sanger traces against it, inspect SNVs and small indels in context, classify mixed-base evidence, and export a reviewed variant table.

## Non-goals

- Clinical-grade interpretation
- Large structural variant discovery
- Automated annotation against external knowledge bases

## User stories

- As a scientist, I can align a trace to my expected amplicon and immediately see mismatches and indels.
- As a reviewer, I can distinguish clean homozygous changes from mixed-base evidence and low-confidence noise.
- As a downstream analyst, I can export reviewed calls as TSV or VCF-like output.

## Scope

### In scope

- User-provided FASTA reference import
- Semiglobal trace-to-reference alignment
- SNV and short indel calling
- Mixed-base and low-confidence site classification
- Variant table export and deep-linking into evidence views

### Out of scope

- Population annotations
- Protein consequence prediction
- Multi-sample joint calling

## UX

### Main surfaces

- `Align to reference` action in the workspace
- Reference panel with coordinates, expected amplicon region, and orientation
- Variant table with filters for `pass`, `mixed`, `low-confidence`, and `indel`
- Evidence drawer showing reference base, observed base(s), quality, and chromatogram snippets

### Review flow

1. Import or paste a FASTA reference.
2. Choose one or more traces to align.
3. Review called differences in the variant table.
4. Accept, reject, or label each call.
5. Export reviewed results.

## Functional requirements

### Alignment

- Automatically try forward and reverse-complement orientations.
- Use semiglobal alignment anchored to the reference region best matching the trace.
- Preserve mapping from trace base index to reference coordinate.

### Calling

- SNVs: compare aligned trace calls against reference bases.
- Mixed bases: interpret IUPAC codes as alternate-support evidence when thresholds are met.
- Indels: support short insertions and deletions with explicit confidence downgrade near noisy contexts.
- Call status: `pass`, `mixed`, `low-confidence`, `manual-review`, `rejected`.

### Exports

- TSV with sample, coordinate, ref, alt, status, evidence summary
- VCF-like export for simple SNVs and short indels
- Reference-annotated FASTA for reviewed consensus when applicable

## Technical approach

### Data model

Add a reference analysis object containing:

- reference id, name, length, and optional selected interval
- aligned trace records with orientation and coordinate map
- called variants with status, evidence metrics, and user review fields
- filters and selected variant state

### Algorithm

1. Build exact-anchor candidates from the trace base string.
2. Refine with banded semiglobal alignment against the candidate reference interval.
3. Walk aligned columns to emit SNVs and short indels.
4. Fuse mixed-base outputs with quality and peak-ratio evidence.
5. Allow user review states to override automatic status without losing the raw call.

### Confidence model

At minimum score calls using:

- trace quality at the site
- local peak-ratio or ambiguity evidence
- proximity to alignment gaps
- contributor agreement when multiple traces cover the same reference coordinate

## Parallel-safe implementation slices

1. Add reference import and pure alignment core.
2. Add variant calling model and export helpers.
3. Add reference/variant UI with evidence navigation.
4. Add multi-trace aggregation and review labels.
5. Add fixtures for clean SNVs, mixed sites, and short indels.

## Acceptance criteria

- Users can align traces to a pasted or uploaded FASTA reference.
- Variant rows deep-link back to the exact chromatogram evidence.
- Mixed-base calls are clearly separated from clean substitutions.
- Exported variant tables preserve user review status.

## Validation

- Alignment tests covering forward and reverse-complement matches
- Variant-call tests for substitutions, ambiguous calls, insertions, and deletions
- Browser tests for variant-table navigation and export
