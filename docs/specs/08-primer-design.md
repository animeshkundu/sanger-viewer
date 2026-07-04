# Differentiator Spec — Primer Design

## Outcome
Design candidate PCR/sequencing primers directly from a trace, contig, or reference window without leaving the browser.

## Why this wins
When a read fails or a confirmation assay is needed, the next action is usually primer design. Embedding that action keeps the scientist in the same evidence context.

## User value
- Select a region and generate forward/reverse primer candidates.
- Avoid low-complexity or variant-heavy sequence automatically.
- Carry chosen primers into downstream Tm and in-silico-PCR tools.

## Scope
### In
- Candidate generation from selected sequence windows
- Basic primer rules: length, GC %, 3′ clamp, homopolymer limits, self-complement warnings
- Exclusion of ambiguous bases by default
- Save chosen primer pairs in session state

### Out
- Genome-wide off-target search
- Degenerate-primer design in v1
- Wet-lab ordering integration

## UX
- Add `Design primers` from selected range or reference panel.
- Allow target mode selection:
  - sequencing primer
  - PCR primer pair
  - rescue primer around failed read segment
- Present ranked candidates with rationale and warnings.

## Data model
- `PrimerCandidate`
  - direction
  - sequence
  - start/end
  - GC %
  - penalty score
  - warning flags
- `PrimerSet`
  - source sequence id
  - chosen candidates
  - intended use

## Implementation shape
- Build a pure primer-scoring module using client-side heuristics.
- Consume either raw trace-derived sequence, contig consensus, or reference subsequence.
- Keep the first release deterministic and transparent rather than black-box optimized.

## Parallel-safe build slices
1. Primer candidate schema and scoring utilities.
2. Candidate list UI for a selected region.
3. Primer set persistence in sessions.
4. Hand-off hooks into Tm and in-silico-PCR specs.

## Acceptance
- A user can select a region and generate ranked primer candidates in-browser.
- Ambiguous or low-quality regions are flagged or excluded by default.
- Chosen primer sets are reusable by later analysis modules.
- Primer design remains fully client-side.
