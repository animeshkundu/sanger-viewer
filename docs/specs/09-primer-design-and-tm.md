# 09 — Primer design and Tm workspace

**Status:** Proposed  
**Outcome:** Users can select a target region and get practical primer candidates with transparent melting-temperature calculations inside the same browser workspace.

## Why this matters
Primer design is a natural next action after reviewing Sanger data. Keeping it in the same workspace is a strong browser-native differentiator versus tools that force a context switch.

## Scope
- Select a target interval on a reference or resolved contig.
- Generate forward/reverse primer candidates around the interval.
- Compute GC%, length, homopolymer risk, and melting temperature.
- Let users pin, rename, and export chosen primers.

## Non-goals
- No whole-genome primer search.
- No exhaustive secondary-structure thermodynamics in the first slice.
- No wet-lab ordering integration.

## Design rules
- Primer candidate generation starts from simple constraints: length range, product size range, GC range, and 3' clamp preference.
- Tm uses a documented nearest-neighbor implementation with explicit salt assumptions.
- Candidate quality flags are explainable: low complexity, long homopolymer, high/low GC, large Tm delta between pair members.

## UX spec
- Add a **Primers** panel that appears when a reference or contig is active.
- Region selection on the sequence/reference view seeds primer design.
- Candidate table columns: name, sequence, direction, start, length, GC%, Tm, flags.
- Choosing a pair pins them on the reference view for later in-silico PCR.

## Data model
```ts
interface PrimerCandidate {
  id: string
  name: string
  sequence: string
  direction: 'forward' | 'reverse'
  start: number
  end: number
  gcPercent: number
  tmCelsius: number
  flags: string[]
}
```

## Implementation slice
- Primer utilities under a new analysis module.
- Shared coordinate handling with reference alignment.
- UI table plus selection/export actions.
- Tests for Tm math and candidate filtering.

## Acceptance criteria
- A user can design primers from a chosen region without leaving the app.
- Every reported Tm is reproducible from documented assumptions.
- Primer candidates expose quality flags instead of opaque ranking.
- Chosen primers become reusable inputs for in-silico PCR.

## Validation plan
- Unit tests for Tm calculation and candidate filters.
- Fixture tests for deterministic candidate generation on a known template.
- E2E test for select region, design primers, pin pair, and export.
