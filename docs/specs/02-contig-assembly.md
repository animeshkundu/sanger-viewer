# Differentiator spec — Contig assembly

## Why this matters

Most lightweight trace viewers stop at single-read inspection. sanger-viewer can become a real finishing workspace by assembling forward and reverse reads into one evidence-backed contig without leaving the browser.

## Product outcome

Users can load multiple traces for the same amplicon, assemble them into a contig, inspect disagreements in chromatogram context, edit low-confidence positions, and export the resulting consensus.

## Non-goals

- Whole-genome assembly
- De novo assembly from large read sets
- Automatic primer design

## User stories

- As a scientist, I can merge forward and reverse Sanger reads into one consensus sequence.
- As a reviewer, I can inspect every contig disagreement with the underlying peaks for each contributing read.
- As a lab member, I can export a reviewed consensus FASTA and a mismatch report.

## Scope

### In scope

- Amplicon-scale assembly from 2–20 Sanger traces
- Automatic reverse-complement handling
- Semiglobal overlap alignment for assembly
- Quality-aware consensus calling
- Contig evidence view linked back to trace windows

### Out of scope

- Reference-guided variant interpretation
- Structural variant calling
- Assembly graph visualization

## UX

### Main surfaces

- `Assemble contig` action from the multi-trace workspace
- Contig sidebar summarizing length, coverage, unresolved bases, and disagreement count
- Stacked evidence view with consensus row, read rows, and mismatch markers
- Jump controls for next disagreement, low-coverage site, and unresolved `N`

### Review interactions

- Click a contig position to open aligned contributing traces at the corresponding chromatogram locus.
- Toggle inclusion of individual reads from the consensus.
- Pin manual consensus edits that survive recomputation until explicitly cleared.

## Functional requirements

### Input handling

- Accept any workspace traces as assembly candidates.
- Group reads into an assembly set explicitly chosen by the user.
- Record read orientation and user exclusions in session state.

### Assembly model

- Use semiglobal pairwise alignment to find overlaps between reads.
- Build a shared contig coordinate system with gaps where required.
- Compute per-position support using base identity, quality score, and contributor count.
- Emit `N` when evidence is insufficient or conflicting beyond threshold.

### Consensus behavior

- Prefer higher-quality bases when contributors disagree.
- Surface mixed or unresolved sites distinctly from hard consensus edits.
- Preserve user-pinned consensus overrides after recalculation.

### Outputs

- Consensus FASTA
- TSV or CSV disagreement report with contig position, contributing reads, and support metrics
- Optional aligned multi-FASTA export for downstream tools

## Technical approach

### Data model

Add a contig session object containing:

- assembly id and source slot ids
- per-read aligned coordinates and orientation
- contig sequence and confidence annotations
- mismatch, gap, and low-support indices
- user overrides

### Algorithm

1. Normalize read orientation.
2. Seed overlaps using exact k-mer anchors on base-called sequence.
3. Refine overlaps with banded semiglobal alignment.
4. Build aligned contig columns.
5. Call consensus from quality-weighted evidence.
6. Persist coordinate maps from contig positions back to trace base indices.

### Performance targets

- 2–20 reads, each up to ~1.5 kb, should assemble interactively on the main thread or worker without a visible stall.
- Recomputing after excluding one read should feel near-instant for small amplicon sets.

## Parallel-safe implementation slices

1. Add pure assembly core and coordinate-map types.
2. Add consensus-with-support model and export helpers.
3. Add contig review UI and trace-jump interactions.
4. Add manual override persistence.
5. Add fixtures and tests for overlapping, partial, and conflicting reads.

## Acceptance criteria

- Users can assemble at least forward/reverse amplicon pairs into one reviewed consensus.
- Every contig column can be traced back to contributing chromatogram positions.
- Low-support or conflicting sites are obvious in the UI and export report.
- Manual consensus overrides persist across recomputation.

## Validation

- Fixture-driven tests for perfect overlap, offset overlap, partial overlap, and contradictory evidence
- UI tests for disagreement navigation and trace back-linking
- Export tests for consensus FASTA and disagreement tables
