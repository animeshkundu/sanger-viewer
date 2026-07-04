# Spec: Reference alignment and variant calling

## Goal
Let users align one trace or one assembled contig against a known reference sequence, inspect differences in chromatogram context, and export a small trusted variant report directly in the browser.

## Why this is a differentiator
- SnapGene wins because traces are anchored to a sequence record instead of floating as isolated files.
- Benchling-style context matters: review is faster when variants, annotations, and raw evidence are connected.
- A browser-native trace viewer becomes a true validation workspace once “does this match my construct?” is a first-class flow.

## User outcomes
- A user can paste/import a reference FASTA and align the active trace or contig to it.
- The app highlights SNVs, insertions, deletions, and ambiguous calls against the reference.
- Every called difference links back to trace evidence before export.

## Scope
### In scope
- Reference FASTA/text import and in-memory storage for the current workspace.
- Alignment of:
  - a single displayed trace sequence
  - a contig consensus from the assembly spec
- A reference comparison lane with reference bases, aligned sample bases, and variant markers.
- Variant table columns:
  - coordinate
  - ref
  - alt
  - type
  - confidence/evidence summary
  - affected annotation name when available
- Export of aligned sample FASTA and variant CSV/JSON.

### Out of scope
- VCF normalization parity with large-scale NGS tools.
- Structural variants beyond small indels relevant to Sanger confirmation.
- Online reference fetching from external sequence databases.

## UX
1. User loads a trace or contig.
2. User imports or pastes a reference.
3. User clicks **Align to Reference**.
4. App shows an alignment view with synchronized trace evidence and a sortable variant table.
5. Clicking a variant scrolls the chromatogram and highlights the evidence peak(s).
6. User exports a review-ready variant summary.

## Data model
```text
ReferenceAlignment
- referenceId
- subjectType: trace | contig
- alignedReference
- alignedSubject
- coordinateMap[]
- variants[]
  - start
  - end
  - ref
  - alt
  - type
  - evidence
  - annotationIds[]
```

## Technical approach
- Use local alignment for trace-to-reference seeding, then refine into a deterministic global-in-window alignment for the matched region.
- Derive calls from displayed sequence plus ambiguity state, not from stale raw sequence.
- Mark low-confidence calls when the underlying base is trimmed, ambiguous, or poorly supported by quality.
- Reuse annotation lanes when a reference carries feature intervals so users can see whether a variant lands in CDS/primer/feature space.

## PR slices
1. Add reference import model and pure alignment/coordinate-map logic with tests.
2. Add pure variant extraction with confidence tiers.
3. Add alignment lane + variant table UI.
4. Add export flows and E2E coverage for trace/contig review.

## Acceptance criteria
- A matching reference produces zero variants and stable coordinate mapping.
- SNVs and short indels are called with exact coordinates and visible trace evidence.
- Trimmed or ambiguous positions are flagged instead of overstated as high confidence.
- Reference alignment works for both a single trace and a contig consensus.

## Dependencies
- Can ship for single-trace inputs first.
- Integrates with contig assembly when that spec is available, but does not block on it.
