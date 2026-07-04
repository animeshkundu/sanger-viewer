# 06 — Contig review and curated consensus

## Goal
Give contigs a dedicated review workflow for resolving disagreements, locking manual decisions, and exporting an auditable consensus sequence.

## Why this is a differentiator
Assembly alone reaches parity; curated consensus with visible evidence and non-destructive edits is where the browser app becomes preferable for real review work.

## Current foundation
- Base editing, undo/redo, mixed-base calling, and base inspector already exist.
- The single-read viewer already models explicit review state that can be extended to contigs.

## User outcomes
- Review disagreements one by one.
- Override consensus bases without losing the original trace evidence.
- Export a final curated sequence with provenance.

## In scope
- Disagreement list with filters for unresolved, edited, ambiguous, and low-quality positions.
- Manual consensus overrides with undo/redo and visual provenance.
- Export of curated consensus FASTA plus a lightweight review summary.
- Clear distinction between automatic consensus and manually curated consensus.

## UX specification
- Contig view should have a **Review conflicts** mode.
- Show disagreement count, unresolved count, and current review state in the header.
- Selecting a conflict synchronizes all evidence rows, inspector details, and consensus edit controls.
- Manual overrides must remain visibly pinned even if underlying thresholds or trim settings change later.

## Technical shape
- Introduce a contig-level edit model instead of mutating source traces.
- Store auto consensus, evidence metrics, and user overrides separately.
- Reuse the existing edit persistence principle: derived algorithmic calls may update, but explicit user overrides win.

## Validation
- Unit tests for override precedence, undo/redo, and summary generation.
- Browser tests for conflict navigation, manual resolution, and export behavior.
- Cross-feature regression tests with reverse-complement, trimming, and mixed-base evidence.

## Dependencies
- Depends on spec 05.

## Non-goals
- Collaborative review comments.
- Rich plasmid/construct editing.
- Hiding disagreement evidence after a base is curated.
