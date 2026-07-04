# Spec 05 — Paired-read contig assembly

## Goal
Merge forward and reverse Sanger reads for the same amplicon into a single contig workspace with an auditable overlap, consensus, and disagreement review path.

## Why this is a differentiator
This is the point where `sanger-viewer` moves beyond “viewer” into a real finishing workspace without becoming a heavyweight desktop suite.

## Current baseline
- The app already supports multiple loaded traces, reverse-complement viewing, editable bases, and a simple ungapped cross-trace consensus row.
- There is no overlap discovery, strand-aware pairing, or contig coordinate system.

## User-facing outcome
- Users can select two reads and run `Assemble pair`.
- The app finds the best overlap, reverse-complements as needed, and produces a contig view with:
  - left-only region
  - overlap region
  - right-only region
  - consensus sequence
  - disagreement markers

## Product requirements
1. Pairing must support F/R reads loaded in either orientation.
2. Overlap detection must use quality-aware local alignment, not simple positional clamping.
3. The assembled contig must preserve trace provenance for every contig base.
4. Manual base edits must remain non-destructive and traceable back to the source read.
5. Failed assemblies must explain why pairing was rejected.

## Proposed implementation shape
- Add `src/assembly/pairAssembly.ts` for overlap search, scoring, and contig coordinate mapping.
- Add a paired-contig review surface above the existing trace panels rather than replacing them.
- Require explicit pair selection from the workspace to avoid accidental auto-assembly.
- Store assembly objects separately from raw trace slots so users can delete/rebuild them.

## Acceptance checks
- Known forward/reverse fixtures assemble into a deterministic overlap and consensus.
- The overlap view shows disagreements with direct jump-to-source-trace affordances.
- Rebuilding after a source edit updates only the relevant assembly.
- Assemblies survive session export/import.

## Non-goals
- Multi-read contig graphs
- De novo assembly from unrelated reads
- Reference alignment or variant annotation

## Parallel-safe PR boundary
Limit this PR to two-read assembly, overlap modeling, and contig review UI. Multi-read finishing, reference mapping, and primer tools remain separate.
