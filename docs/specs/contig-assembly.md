# Contig assembly

## Why this matters

Feature parity tools stop at “view one trace.” A preferred Sanger workspace must let users assemble forward/reverse reads and small read sets into a trustworthy contig without leaving the browser.

## Product outcome

Add a browser-native contig assembly workflow that aligns overlapping traces, builds a consensus, highlights disagreements, preserves raw evidence, and supports manual review/resolution.

## Scope

### In scope

- Pairwise and small-batch assembly for typical Sanger projects.
- Automatic orientation detection and overlap finding.
- Contig consensus with quality-aware conflict handling.
- Visual disagreement review across chromatograms and consensus.
- Manual conflict resolution that preserves provenance.
- Export of consensus plus assembly report.

### Out of scope

- Whole-genome or NGS-scale assembly.
- Graph assembly visualizations beyond simple linear contigs.
- Any server-side job system.

## Primary user workflows

1. A user loads forward and reverse reads from one amplicon and clicks **Assemble contig**.
2. The app proposes a contig, marks low-confidence joins, and opens a compare/review surface.
3. The user jumps through disagreements, inspects underlying peaks, and accepts or overrides consensus bases.
4. The user exports the contig sequence and a join-quality report.

## UX specification

### Entry points

- Compare drawer action: **Assemble contig**
- Workspace badge when reads appear overlap-compatible

### Assembly review surface

- Consensus row pinned above assembled reads.
- Read stack with offsets, orientation badges, trim boundaries, and quality summaries.
- Disagreement lane with next/previous navigation.
- Right-side assembly panel with:
  - overlap length
  - percent identity
  - unresolved conflict count
  - low-confidence region count
  - manual overrides list

### Conflict states

- **Resolved automatically**: consensus base shown with support count/quality cue.
- **Ambiguous**: IUPAC consensus if rules allow, otherwise unresolved marker.
- **Manually overridden**: explicit edited state and provenance note.

## Data and algorithm model

### Input normalization

- Respect current trim mode and strand state, but keep raw traces accessible for provenance.
- Normalize reads into a common forward orientation for assembly calculations.

### Overlap detection

- Seed with k-mer/shared-substring candidate windows.
- Refine with banded local alignment suitable for short Sanger reads.
- Score candidates using base identity plus quality-weighted mismatch penalties.

### Consensus model

- Base support combines called base, quality score, manual edits, and overlap coverage.
- Allow IUPAC output for mixed or weakly supported positions when configured.
- Distinguish “true ambiguity” from “insufficient evidence.”

## Implementation shape

### Slice 1 — Assembly core

- Add overlap detection, offset solving, and consensus generation in pure TypeScript.
- Define assembly result types independent of UI.

### Slice 2 — Compare/contig UI

- Add assembled read stack and consensus/disagreement lanes.
- Support jump-to-conflict navigation.

### Slice 3 — Manual resolution

- Let users resolve consensus conflicts from chromatogram evidence.
- Preserve override provenance separately from raw base edits.

### Slice 4 — Export/reporting

- Export consensus FASTA and assembly summary report.
- Include unresolved positions and manual overrides.

## Validation requirements

- Correctly assembles common forward/reverse read pairs with partial overlap.
- Handles no-overlap, weak-overlap, and reverse-orientation cases explicitly.
- Conflict navigation always lands on synchronized read/consensus positions.
- Manual overrides survive tab switches, refreshable session restore, and downstream exports.

## Acceptance criteria

- A user can assemble typical Sanger read pairs into one reviewed contig in-browser.
- The UI shows where consensus bases came from and where confidence is weak.
- Automatic assembly never hides disagreement; raw evidence remains inspectable.
- Exported consensus and report reflect automatic and manual resolutions accurately.

## Non-goals and risks

- Assembly heuristics must be optimized for small Sanger projects, not generalized beyond that.
- Poor trim/quality inputs can create false overlaps; confidence thresholds must be conservative.
- Contig editing must never overwrite underlying trace evidence.
