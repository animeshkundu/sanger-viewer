# 08 — Primer workbench

- Status: Proposed
- Build wave: D3
- Depends on: none
- Enables: primer walking, troubleshooting failed reads, assay planning

## Goal
Add a primer-centric workspace where users can create, import, inspect, and reuse primers directly alongside traces and references.

## Why this matters
Primer context is missing from lightweight viewers, yet it drives how biologists interpret bad starts, weak signal, off-target products, and next-step assay design.

## User outcomes
- A user can define primer sequences with names, direction, tags, and notes.
- Primers can be matched onto the active trace, contig, or reference.
- The workspace explains whether the primer supports sequencing, confirmation, or follow-up PCR work.

## Scope
- Primer library scoped to the current session.
- Primer import via paste and simple table upload.
- Match display on forward/reverse strands with coordinate spans.
- Primer detail panel with length, GC%, homopolymer warnings, and reuse notes.

## UX requirements
- Primer hits are rendered as a dedicated annotation layer.
- The user can pin one primer as the active context for downstream Tm and PCR tools.
- Missing or weak matches are shown explicitly.

## Acceptance criteria
- Primers can be created, edited, deleted, and associated with active reads/references.
- Primer-match coordinates stay correct across reverse-complement views.
- Session persistence keeps primer definitions and active selections.
- Automated tests cover matching, reverse-strand display, and primer-library CRUD.

## Non-goals
- Fully automatic primer design in the first release.
- External primer ordering integrations.
