# 04 — Plate context and sample normalization

## Summary
Turn raw file batches into biologically meaningful sample groups by inferring sample identity, plate position, read direction, and replicate relationships from filenames and optional sample sheets.

## Why this is a differentiator
Biologists do not think in raw instrument filenames. They think in wells, constructs, colonies, amplicons, primers, and replicate pairs. A browser-native Sanger workspace should understand that organization layer instead of forcing manual bookkeeping outside the tool.

## Current baseline
The app preserves only the loaded trace file name. There is no concept of sample identity, well position, plate layout, or pairing rules.

## Goals
- Normalize noisy trace filenames into stable sample records.
- Infer forward/reverse pair candidates.
- Visualize 96-well or 384-well context when metadata is available.
- Keep all of this optional and transparent.

## Non-goals
- No proprietary instrument format parsing beyond available filename and user-supplied metadata.
- No external sample-sheet fetches.

## User workflows
1. User imports a batch whose filenames encode sample and primer names.
2. App suggests normalized sample IDs and read directions.
3. User uploads an optional CSV sample sheet to map wells, targets, and primer names.
4. App groups traces by sample and shows missing mates, duplicate reads, or unexpected plate positions.

## Spec
### Inputs
- filename heuristics
- optional CSV sample sheet
- manual row-level overrides

### Normalized sample record
- `sampleId`
- `well`
- `plateId`
- `targetName`
- `primerName`
- `direction`
- `replicateGroup`
- `sourceTraceIds[]`

### Filename heuristic rules
- Tokenize by common separators.
- Detect well-like tokens such as `A01`.
- Detect direction tokens such as `F`, `R`, `forward`, `reverse`.
- Preserve raw filename and expose how each field was inferred.
- Never overwrite manual edits with later heuristic runs.

### Plate view
- Optional heatmap view keyed by well.
- Show pass/review/fail state and missing-read warnings.
- Clicking a well opens its grouped traces.

### Mismatch detection
- duplicate normalized sample IDs
- conflicting primer labels within a pair
- missing forward or reverse mate
- sample-sheet row with no trace
- trace with no sample-sheet match

## Acceptance criteria
- Imported traces can be grouped into normalized sample records.
- Users can review and override inferred metadata.
- Plate view reflects QC state when well metadata exists.
- Pair candidates become available to the contig workflow without re-entry.
- All inference remains explainable from visible rules.

## Parallel build slices
1. Metadata schema and inference engine.
2. CSV sample-sheet import.
3. Review/override UI.
4. Plate heatmap and grouping views.

## Dependencies
- Builds directly on the batch workspace.
- Feeds contig assembly, primer workflows, and reports.
