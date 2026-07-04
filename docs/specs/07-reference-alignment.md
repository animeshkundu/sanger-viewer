# 07 — Reference alignment

**Status:** Proposed  
**Outcome:** Any trace or resolved contig can be aligned to a reference sequence inside the browser and reviewed in reference coordinates.

## Why this matters
Reference-aware review is where browser-native `sanger-viewer` can become more useful than a simple chromatogram viewer. It links trace evidence to the real biological question.

## Scope
- Align a single trace or contig to an attached reference record.
- Auto-detect strand and best placement.
- Support semi-global alignment so read ends do not get over-penalized.
- Render trace coordinates and reference coordinates together.

## Non-goals
- No genome-scale indexing in the first wave.
- No structural variant calling.
- No multiple-reference batch alignment UI in this spec.

## Alignment rules
- Default algorithm: banded semi-global Needleman–Wunsch over called bases.
- IUPAC-aware scoring so ambiguity codes partially match compatible reference bases.
- Prefer the best-scoring unique placement; ambiguous placements surface a warning.
- Circular references are supported by evaluating wrap-around placement.

## UX spec
- Add **Align to reference** in the compare/analysis surface.
- Show three synchronized rows: reference, read/contig, and optional consensus/quality annotation.
- Mismatches, gaps, and trimmed ends use distinct non-color-only markers.
- Clicking an aligned position jumps the chromatogram to the corresponding raw evidence.

## Data model
```ts
interface ReferenceAlignment {
  id: string
  subjectId: string
  referenceId: string
  strand: 'forward' | 'reverse'
  refStart: number
  refEnd: number
  cigar: string
  score: number
  mismatches: number[]
  insertions: number[]
  deletions: number[]
}
```

## Implementation slice
- Alignment engine under a new reference/analysis module.
- Coordinate mappers shared with inspector and future variant/PCR features.
- Alignment UI in the compare drawer or dedicated review panel.
- Tests with known linear and circular references.

## Acceptance criteria
- A user can align a trace or contig to an attached reference without leaving the app.
- Strand and placement are explicit.
- Alignment review preserves jump-back to chromatogram evidence.
- Circular references behave correctly near the origin.

## Validation plan
- Unit tests for alignment scoring and coordinate projection.
- Fixture tests for known placements on linear and circular references.
- E2E test for attach reference, align, inspect mismatch, and jump to trace.
