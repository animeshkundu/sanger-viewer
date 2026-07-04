# 05 — Paired-read contig assembly

## Summary
Add forward/reverse read assembly that produces a reviewed contig, overlap diagnostics, and an auditable consensus from paired Sanger traces.

## Why this is a differentiator
This is one of the biggest gaps between a simple viewer and a real Sanger workspace. Biologists want to confirm a clone or amplicon from both directions without leaving the browser or pasting sequences into separate tools.

## Current baseline
The app already supports multiple open traces, reverse complement display, editable base calls, mixed-base detection, and multi-trace consensus export, but it does not align paired reads or create contigs.

## Goals
- Detect orientation and overlap between paired reads.
- Build a contig sequence with disagreement markers.
- Support review and manual resolution of conflicts.
- Preserve provenance from trace-level edits into the final contig.

## Non-goals
- No de novo assembly of large read sets.
- No assembly graph UI.
- No multi-fragment cloning workflow in the first wave.

## User workflows
1. User selects a forward and reverse read from the batch table or workspace.
2. App proposes an assembled contig with overlap coordinates.
3. User reviews disagreement sites with linked chromatograms.
4. User accepts, edits, or excludes low-confidence positions.
5. User exports contig FASTA and an evidence report.

## Spec
### Assembly pipeline
- Normalize strand orientation.
- Reverse-complement the reverse read when needed.
- Use local overlap alignment with tunable mismatch and gap penalties.
- Score the overlap using base identity, quality, and mixed-base evidence.
- Generate a contig record with left overhang, overlap, and right overhang segments.

### Contig data model
- `contigId`
- `sourceTraceIds[2]`
- `alignment`
- `overlapRange`
- `consensusSequence`
- `conflictSites[]`
- `resolvedEdits[]`
- `qualitySummary`
- `status`: `draft | reviewed | approved`

### Review UI
- Side-by-side or stacked chromatograms anchored to overlap positions.
- Conflict list with jump navigation.
- Visual separation of auto-resolved versus manually resolved sites.
- Per-site decision actions: keep forward, keep reverse, mark ambiguous, trim edge, insert gap.

### Output
- contig FASTA
- overlap report as JSON/CSV
- optional carry-forward to reference alignment and variant calling

## Acceptance criteria
- Users can assemble an inferred or manually chosen read pair.
- Contig output includes explicit overlap and conflict metadata.
- Manual decisions persist and remain attributable to source traces.
- Approved contigs can be exported and reused downstream.
- Failed assemblies explain why they failed instead of silently producing poor output.

## Parallel build slices
1. Pair selection and overlap engine.
2. Contig model and persistence.
3. Conflict review UI.
4. Export and downstream handoff.

## Dependencies
- Benefits from batch pairing metadata.
- Becomes an input source for alignment and variant workflows.
