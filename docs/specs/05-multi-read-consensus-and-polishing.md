# 05 — Multi-read consensus and polishing

- Status: Proposed
- Build wave: D2
- Depends on: 04-paired-read-contig-assembly.md
- Enables: primer-walk finishing, replicate collapse, final sequence handoff

## Goal
Extend the existing multi-trace consensus concept into a full polishing workflow where several reads support one finished sequence with position-level evidence.

## Why this matters
Consensus export alone is not enough for finishing work. Users need to know which positions are supported, disputed, or uncovered before trusting the final sequence.

## User outcomes
- A user can add multiple traces to one assembly group and generate a polished consensus.
- Every consensus position shows contributing reads, confidence, and disagreement count.
- The user can lock a manual resolution for disputed positions and export the finished consensus with provenance.

## Scope
- Assembly groups with ordered member reads.
- Position-level support model: agreeing reads, conflicting reads, gap/coverage state, and confidence tier.
- Manual conflict resolution with provenance notes.
- Export of polished consensus plus an accompanying evidence summary.

## Consensus rules
- Distinguish no-coverage from disagreement.
- Do not collapse low-support positions into a confident canonical base.
- Preserve ambiguous calls when the evidence does not justify resolution.

## UX requirements
- Users can filter to conflict-only positions.
- Clicking a consensus base opens aligned source evidence immediately.
- Exported results clearly separate raw consensus from manually curated positions.

## Acceptance criteria
- Multi-read consensus reports coverage and conflict counts per position.
- Manual resolutions survive session save/resume.
- Exported consensus provenance is sufficient for reviewer audit.
- Automated tests cover support scoring, unresolved ambiguity handling, and manual override persistence.

## Non-goals
- Phylogenetic consensus generation.
- Automatic finishing of large NGS-like read sets.
