# 09 — Collaborative Annotations + Review Handoff

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Teams need shared interpretation context (flags, notes, rationale), not just raw traces and exported sequences.

## Outcome
Users can place structured annotations on loci and hand off review context through browser-native artifacts.

## Scope (build wave)
- Locus-linked annotations (type, severity, note, assignee tag).
- Annotation filters and unresolved/resolved states.
- Annotation-aware permalink payload integration.
- Export review packet (JSON/CSV + summarized notes).

## Non-goals
- Real-time multi-user editing in v1.
- External ticket-system sync in v1.

## UX
1. Analyst marks a locus with note and severity.
2. Analyst copies review permalink and shares it.
3. Reviewer opens same context and resolves/adds annotations.

## Data model
- `Annotation`
  - `id`, `traceId`, `position`
  - `category`, `severity`, `note`
  - `status`, `createdAt`, `updatedAt`

## Acceptance criteria
- Annotation markers render consistently at target loci.
- Filters by status/severity/category update view and counts.
- Shared permalink restores annotations and resolution states.
- Export includes complete annotation audit trail.

## Risks
- Annotation clutter in dense regions.
- Ambiguity in coordinate mapping across transformed views.

## Success metrics
- % reviewed traces containing at least one annotation.
- Annotation resolution turnaround time.
