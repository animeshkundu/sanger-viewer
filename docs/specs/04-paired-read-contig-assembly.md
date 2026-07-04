# 04 — Paired-read contig assembly

- Status: Proposed
- Build wave: D2
- Depends on: 02-batch-intake-and-qc-queue.md
- Enables: forward/reverse finishing, clone verification, amplicon confirmation

## Goal
Let users combine forward and reverse Sanger reads into a single assembled contig with explicit overlap evidence.

## Why this matters
Biologists regularly receive paired reads for one insert. A browser-native viewer becomes superior when it assembles them in-place instead of forcing export to another tool.

## User outcomes
- A user can nominate two traces as mates and assemble them into one contig candidate.
- The app displays overlap span, disagreements, low-confidence joins, and uncovered ends.
- The user can accept the assembly, inspect disagreements, or keep the reads separate.

## Scope
- Pairing UI based on manual selection first, filename heuristics second.
- Reverse-complement handling during mate matching.
- Overlap alignment, conflict marking, and contig sequence generation.
- Side-by-side assembly inspector showing both reads, consensus join, and confidence.

## Assembly rules
- Use quality-aware overlap scoring.
- Prefer high-quality bases when mates disagree.
- Mark unresolved conflicts with IUPAC ambiguity codes rather than hiding disagreement.
- Carry through edited bases and mixed-base calls into the assembly evidence model.

## UX requirements
- Assembly never destroys the underlying source traces.
- Users can jump from any contig disagreement back to the source chromatogram positions.
- The contig summary exposes overlap length, percent identity, and number of conflicts.

## Acceptance criteria
- Forward/reverse mates assemble correctly when one read must be reverse-complemented.
- Low-overlap pairs are rejected with a clear reason instead of producing misleading contigs.
- Conflict visualization links back to both source traces.
- Automated tests cover pairing, overlap edge cases, and ambiguity handling.

## Non-goals
- De novo assembly of unrelated reads.
- Multi-contig scaffolding.
