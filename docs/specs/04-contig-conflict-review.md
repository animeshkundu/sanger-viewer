# 04 — Contig conflict review

## Goal
Make disagreements inside an assembled contig auditable at base resolution so users can trust the result without leaving the browser.

## Why this wins
Assembly alone reaches parity. Evidence-driven conflict review is where a browser workspace can become better than desktop viewers.

## User outcomes
- A user can jump directly to mismatch clusters inside a contig.
- Each disagreeing position shows source-read peaks, qualities, and the current consensus decision.
- A user can accept one read, keep an ambiguity code, or mark the site unresolved.

## In scope
- Conflict list and next/previous navigation.
- Per-position evidence panel for all contributing reads.
- Manual consensus override model for contigs.
- Export of edited contig consensus with audit metadata.

## Out of scope
- Multi-user review assignment.
- Population-level haplotype phasing.

## Product behavior
1. Surface a `Conflicts` panel whenever a contig has disagreements.
2. Rank conflicts by severity using quality, peak separation, and neighborhood noise.
3. Selecting a conflict synchronizes the contig row, source traces, and inspector panel.
4. Manual decisions are visibly pinned and remain distinct from algorithmic consensus.
5. An audit trail records the original call, chosen resolution, and affected read ids.

## Data contract
- Conflict id, contig position, source evidence summary.
- Resolution state: unresolved, resolved-by-read, resolved-as-IUPAC, or masked.
- Optional reviewer note.

## Delivery notes
- Extend the existing edit model rather than inventing a second override system.
- Keep visual language consistent with current mixed-base and consensus affordances.
- Design for later use by variant review without coupling the first implementation.

## Acceptance criteria
- Users can enumerate, inspect, and resolve contig conflicts in the browser.
- Manual resolutions survive export/import within future session artifacts.
- The UI never hides the original source evidence behind a final consensus call.
- Conflict resolution remains deterministic and testable.

## Dependencies
- Builds on `03-paired-read-contig-assembly.md`.
