# 08 — Primer workspace

## Summary
Add a primer-centric workflow where users can define, import, and inspect sequencing or PCR primers alongside traces, references, and assay targets.

## Why this is a differentiator
Sanger verification is tightly linked to primer context: which primer produced the read, where it should bind, and whether a failed run came from assay design or sample quality. Treating primers as first-class objects makes the workspace more useful than a generic trace viewer.

## Current baseline
The app can annotate motifs and restriction sites on the read itself, but there is no primer library or primer-to-read/reference model.

## Goals
- Manage a small local primer library in the browser.
- Link primers to traces, samples, and references.
- Surface expected read direction and target region from primer context.

## Non-goals
- No external oligo ordering integration.
- No genome-wide off-target search in the first wave.

## User workflows
1. User imports a primer CSV or adds primers manually.
2. User associates primers with samples or batch rows.
3. App shows which primer likely generated each read and where it should bind on the reference.
4. User launches Tm checks or in-silico PCR from the same primer record.

## Spec
### Primer record
- `primerId`
- `name`
- `sequence`
- `direction`
- `intendedUse`: `sequencing | pcr | both`
- `targetReferenceId`
- `targetRegion`
- `notes`

### Primer library features
- manual add/edit/delete
- CSV import/export
- duplicate-sequence detection
- reverse-complement aware search

### Viewer integration
- Show associated primer name on trace cards and batch rows.
- Overlay expected binding site on the reference alignment view.
- Use primer direction as a pairing hint in batch normalization.
- Launch downstream checks from the primer detail panel.

### UX
- Primer drawer or panel shared across sessions.
- Clear separation between stored primers and one-off pasted sequences.
- Validation for non-IUPAC bases and duplicate names.

## Acceptance criteria
- Users can create and manage a local primer library client-side.
- Primers can be linked to traces, samples, and references.
- Primer metadata participates in batch normalization and assay review.
- Primer library data persists in saved sessions and local storage.

## Parallel build slices
1. Primer schema and local storage.
2. CSV import/export.
3. Trace and reference integration.
4. Launch points for Tm and PCR tools.

## Dependencies
- Useful on its own.
- Provides shared inputs for Tm and in-silico PCR specs.
