# 07 — Primer + Tm workbench

## Goal
Let users inspect primer binding, orientation, and melting behavior directly against a trace, contig, or reference without leaving the browser.

## Why this wins
Primer context is central to Sanger troubleshooting. Folding it into the viewer makes the app useful before, during, and after sequencing review.

## User outcomes
- A user can paste one or more primer sequences and see where they bind.
- The workspace reports strand, start/end, mismatches, GC%, length, and Tm for each primer.
- Users can compare multiple candidate primers in one browser session.

## In scope
- Primer list entry and validation.
- Exact and mismatch-tolerant primer binding scan against active sequence context.
- Basic primer metrics panel: length, GC%, approximate Tm, 3′ mismatch emphasis.
- Primer-to-viewer navigation and highlighting.

## Out of scope
- Full de novo primer design.
- Secondary-structure prediction beyond simple warnings.
- External oligo databases.

## Product behavior
1. Add a `Primers` panel that accepts pasted or imported primer sequences.
2. For each primer, evaluate forward and reverse-complement binding sites against the active target.
3. Highlight predicted binding intervals on the existing annotation track with a dedicated visual treatment.
4. Mark risky features such as multiple genomic hits within the active target, weak 3′ matches, or out-of-range Tm.
5. Keep primer sets local to the current browser workspace unless exported by the user.

## Data contract
- Primer id, label, sequence, orientation.
- Target hit list with mismatch counts and coordinates.
- Derived metrics including GC% and chosen Tm model output.
- Status flags for pass/review/fail.

## Delivery notes
- Reuse annotation-track patterns so primer hits feel native to the viewer.
- Implement Tm calculations in pure TypeScript with test fixtures.
- Plan for later reuse by in-silico PCR.

## Acceptance criteria
- Users can add primers and inspect binding locations against an active target.
- Primer metrics and warnings are reproducible and visible in the UI.
- Navigation from primer row to sequence context is immediate.
- All computation remains client-side.

## Dependencies
- Independent, but reference-aligned contexts from `05-reference-alignment.md` should be valid targets.
