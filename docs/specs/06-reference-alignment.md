# 06 — Reference alignment

## Summary
Add a reference-aware mode that aligns a trace or reviewed contig to a user-supplied reference sequence and makes every downstream call coordinate-aware.

## Why this is a differentiator
A high-value Sanger workspace is not just about viewing peaks; it is about confirming whether a read matches an expected construct, amplicon, or edited locus. Reference coordinates are the bridge from raw trace to biological conclusion.

## Current baseline
The viewer is read-centric. It can search motifs and show intrinsic annotations, but it does not align to an external reference or track coordinates across traces.

## Goals
- Align single traces or contigs to a reference sequence in the browser.
- Surface start, end, strand, coverage, and mismatch context.
- Create one reusable coordinate system for annotations and variant review.

## Non-goals
- No whole-genome alignment.
- No remote reference download service.
- No support for large BAM/SAM ecosystems in the first wave.

## User workflows
1. User pastes or uploads a reference FASTA.
2. User aligns one trace or a contig to the reference.
3. App shows the mapped interval, strand, and identity summary.
4. User jumps between alignment mismatches and raw chromatogram evidence.

## Spec
### Inputs
- reference FASTA text or file
- source sequence from a trace or contig
- optional expected amplicon range or target label

### Alignment behavior
- Use local alignment by default.
- Automatically test both source orientations and keep the best-scoring mapping.
- Record gaps explicitly for downstream indel review.
- Report when multiple near-tied placements exist.

### Alignment record
- `alignmentId`
- `referenceId`
- `sourceType`: `trace | contig`
- `sourceId`
- `referenceStart`
- `referenceEnd`
- `sourceStart`
- `sourceEnd`
- `strand`
- `cigarLikeOps`
- `identity`
- `ambiguityFlags[]`

### UX
- Reference panel with FASTA management and active reference selection.
- Alignment summary badge in batch, trace, and contig views.
- Coordinate ruler that can toggle between read coordinates and reference coordinates.
- Mismatch navigator shared with the variant review surface.

## Acceptance criteria
- A trace or contig can be aligned against a user-provided reference entirely client-side.
- Best orientation and mapped interval are exposed clearly.
- Alignment records persist in saved sessions and workspace bundles.
- Ambiguous placements are flagged and never silently hidden.
- Alignment output can feed the variant workflow without recomputation of the source sequence.

## Parallel build slices
1. Reference ingest and storage.
2. Local alignment engine.
3. Coordinate-aware UI.
4. Alignment persistence and reuse.

## Dependencies
- Works standalone for trace-to-reference confirmation.
- Unlocks variant calling and assay validation workflows.
