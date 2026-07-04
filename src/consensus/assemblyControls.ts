/**
 * assemblyControls.ts — Pure-TypeScript module for user-facing assembly control state.
 *
 * Provides:
 *   - AssemblyControlState — the user-visible control knobs.
 *   - DEFAULT_ASSEMBLY_CONTROLS — sensible defaults matching the auto-assembly behaviour.
 *   - applyStrandOverride — pre-orients a read according to user choice.
 *   - assembleWithControls — full assembly pipeline with overrides applied.
 *
 * No DOM dependencies; all logic is deterministic and testable in Node.
 */

import { reverseComplement } from './overlap'
import { findBestOverlap } from './overlap'
import { buildPairedContig, type PairedContig } from './contig'

// ── Control state ─────────────────────────────────────────────────────────────

/**
 * User-facing knobs for the contig-assembly pipeline.
 *
 * strandA / strandB:
 *   'auto'    — let findBestOverlap pick the best orientation automatically.
 *   'forward' — treat the read as already in the forward orientation (as-is).
 *   'reverse' — treat the read as a reverse-strand read; pre-apply RC before assembly.
 *
 * minOverlap:
 *   Minimum number of bases required in the overlap region (passed directly to
 *   findBestOverlap / buildPairedContig).  Range: 5–200.
 *
 * minMatchFraction:
 *   Minimum required ratio of overlap score to overlap length.  The overlap score
 *   uses +1 / +0.5 / 0 / −1 per-position rules (see scoreOverlap), so a value of
 *   0.75 means "at least 75 % of overlap positions must contribute a positive score".
 *   Range: 0.0–1.0.  Default 0 ≡ accept any positive-scoring overlap.
 */
export interface AssemblyControlState {
  strandA: 'auto' | 'forward' | 'reverse'
  strandB: 'auto' | 'forward' | 'reverse'
  minOverlap: number
  minMatchFraction: number
}

/** Defaults that reproduce the pre-v26 auto-assembly behaviour exactly. */
export const DEFAULT_ASSEMBLY_CONTROLS: AssemblyControlState = {
  strandA: 'auto',
  strandB: 'auto',
  minOverlap: 20,
  minMatchFraction: 0,
}

// ── Strand override ───────────────────────────────────────────────────────────

/**
 * Apply a user-specified strand override to a read's sequence and quality array.
 *
 * - 'auto' / 'forward': returns seq and qual unchanged.
 * - 'reverse':          returns the reverse complement of seq and the reversed qual
 *                       array (since quality scores are position-indexed).
 */
export function applyStrandOverride(
  seq: string,
  qual: number[] | null,
  override: AssemblyControlState['strandA'],
): { seq: string; qual: number[] | null } {
  if (override === 'reverse') {
    const rcSeq = reverseComplement(seq)
    const rcQual = qual ? qual.slice().reverse() : null
    return { seq: rcSeq, qual: rcQual }
  }
  // 'auto' and 'forward' both pass the sequence unchanged; 'auto' lets the
  // assembler try all four orientation pairings internally.
  return { seq, qual }
}

// ── Controlled assembly ───────────────────────────────────────────────────────

/** Minimal read-slot shape required by assembleWithControls. */
export interface AssemblySlot {
  id: string
  fileName: string
  sequence: string
  qualities: number[] | null
}

/**
 * Assemble two reads with user-specified controls applied deterministically.
 *
 * Steps:
 *   1. Pre-orient each read according to strandA / strandB overrides.
 *   2. Check the minMatchFraction threshold by calling findBestOverlap once.
 *   3. If the threshold is met (or minMatchFraction === 0), call buildPairedContig
 *      with the pre-oriented sequences and the requested minOverlap.
 *
 * Returns null when no qualifying overlap is found.
 */
export function assembleWithControls(
  slotA: AssemblySlot,
  slotB: AssemblySlot,
  controls: AssemblyControlState,
): PairedContig | null {
  const { seq: seqA, qual: qualA } = applyStrandOverride(slotA.sequence, slotA.qualities, controls.strandA)
  const { seq: seqB, qual: qualB } = applyStrandOverride(slotB.sequence, slotB.qualities, controls.strandB)

  // When the caller wants a minimum match-fraction, screen the overlap first.
  if (controls.minMatchFraction > 0) {
    const candidate = findBestOverlap(seqA, seqB, controls.minOverlap)
    if (!candidate) return null
    const fraction = candidate.score / candidate.overlapLength
    if (fraction < controls.minMatchFraction) return null
  }

  return buildPairedContig(
    slotA.id, slotA.fileName, seqA, qualA,
    slotB.id, slotB.fileName, seqB, qualB,
    controls.minOverlap,
  )
}
