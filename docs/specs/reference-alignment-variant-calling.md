# Reference alignment and variant calling

## Why this matters

The highest-leverage upgrade over viewer-only tools is turning trace review into evidence-backed sequence verification. Users should be able to align a read or contig to a reference and leave with a small, trustworthy variant list.

## Product outcome

Add client-side alignment of traces or assembled consensuses against a reference sequence, with synchronized mismatch review, lightweight variant calling, and exportable verification results.

## Scope

### In scope

- Reference import from FASTA/GenBank/plain sequence.
- Alignment of single traces and assembled consensuses to a chosen reference window.
- Detection of substitutions, insertions, deletions, low-confidence differences, and ambiguous positions.
- Variant table linked to chromatogram and reference positions.
- Export of aligned consensus plus called-variant report.

### Out of scope

- Genome-scale indexing or whole-chromosome browsing.
- Population/VCF workflows beyond small targeted amplicon verification.
- Backend compute services.

## Primary user workflows

1. A user loads a trace or contig and adds a reference sequence.
2. The app aligns the query to the best matching reference region and opens a compare view.
3. The user steps through mismatches, inspects peak evidence, and marks uncertain sites.
4. The user exports a reviewed variant summary for downstream reporting.

## UX specification

### Entry points

- Compare drawer action: **Align to reference**
- Empty-state dropzone for reference files when traces are already loaded

### Alignment review surface

- Reference row
- Query consensus/read row
- Variant markers between or above rows
- Chromatogram evidence panel synchronized to the active variant
- Right-side summary panel with:
  - aligned region
  - coverage/usable length
  - mismatch count
  - indel count
  - low-confidence call count
  - edited/manual-review count

### Variant table columns

- query name
- reference name
- reference coordinate
- query coordinate
- ref allele
- alt allele
- variant class
- confidence state
- evidence source (`single read`, `contig`, `manual override`)

## Data and algorithm model

### Alignment strategy

- Use a short-sequence alignment method optimized for hundreds to low-thousands of bases.
- Support local alignment for partial reads and full-length comparison for assembled amplicons.
- Carry forward trimmed regions, strand normalization, and manual edits explicitly.

### Variant classification

- `pass`: strong chromatogram or contig support
- `review`: conflicting/ambiguous support
- `filtered`: outside usable region or below threshold

### Confidence model

- Combine PHRED quality, overlap support when using a contig, manual edits, and ambiguity state.
- Indels near low-quality ends should default to review rather than pass.

## Implementation shape

### Slice 1 — Reference import and alignment core

- Add reference parsers/reuse existing sequence import paths.
- Implement query-to-reference alignment and coordinate mapping.

### Slice 2 — Alignment/variant UI

- Add compare surface rows and synchronized variant navigation.
- Add table/list view for called differences.

### Slice 3 — Review and filtering rules

- Add confidence classes and review-focused navigation.
- Distinguish editable/manual-reviewed positions from untouched calls.

### Slice 4 — Export/report

- Export aligned consensus and reviewed variant summary.
- Ensure permalink/session state can reopen the same variant review context.

## Validation requirements

- Correctly handles partial reads, reverse-oriented reads, and assembled consensuses.
- Coordinates remain stable when switching between chromatogram view and variant table.
- Low-quality ends do not over-call confident variants.
- Alignment failures or poor matches produce explicit “no trustworthy alignment” states.

## Acceptance criteria

- A user can align a trace or contig to a reference in-browser and inspect each called difference with chromatogram evidence.
- The variant table is navigable, confidence-aware, and exportable.
- Manual review state is preserved and clearly separated from automatic calls.
- The workflow stays client-side and suitable for static hosting.

## Non-goals and risks

- This is a verification workflow, not a clinical-grade variant pipeline.
- Repetitive references and noisy low-quality reads can create misleading local alignments; the UI must expose uncertainty.
- Coordinate conventions must be documented clearly from the first release.
