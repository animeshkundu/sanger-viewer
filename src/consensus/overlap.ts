/**
 * overlap.ts — Ungapped greedy overlap finder for paired Sanger reads.
 *
 * Tries four orientations (A→B fwd, A→B fwd/rc, B→A fwd, B→A fwd/rc) and,
 * for each, scores every possible overlap length from minOverlap to the shorter
 * sequence length. Returns the candidate with the highest score, or null if the
 * best score is ≤ 0.
 *
 * Performance: O(n²) on sequence length — for typical Sanger reads (~800 bases)
 * this amounts to ~640 k iterations per orientation, well within budget.
 *
 * TODO: gapped assembly follow-up (docs/specs/05)
 */

// ── IUPAC compatibility set ─────────────────────────────────────────────────

/** Expand an IUPAC base to the set of canonical bases it represents. */
const IUPAC_EXPANSIONS: Record<string, string[]> = {
  A: ['A'], C: ['C'], G: ['G'], T: ['T'],
  U: ['T'], // uracil treated as thymine for RNA-origin read compatibility
  M: ['A', 'C'], R: ['A', 'G'], W: ['A', 'T'],
  S: ['C', 'G'], Y: ['C', 'T'], K: ['G', 'T'],
  V: ['A', 'C', 'G'], H: ['A', 'C', 'T'],
  D: ['A', 'G', 'T'], B: ['C', 'G', 'T'],
  N: ['A', 'C', 'G', 'T'],
}

/**
 * Check whether two (possibly IUPAC-ambiguous) bases are compatible.
 * Two bases are compatible if their expansion sets have a non-empty intersection.
 */
function iupacCompatible(a: string, b: string): boolean {
  const ea = IUPAC_EXPANSIONS[a.toUpperCase()] ?? []
  const eb = IUPAC_EXPANSIONS[b.toUpperCase()] ?? []
  return ea.some((x) => eb.includes(x))
}

// ── Reverse complement ───────────────────────────────────────────────────────

const RC_TABLE: Record<string, string> = {
  A: 'T', T: 'A', U: 'A', C: 'G', G: 'C',
  M: 'K', K: 'M', R: 'Y', Y: 'R', S: 'S', W: 'W',
  B: 'V', V: 'B', D: 'H', H: 'D', N: 'N',
}

export function reverseComplement(seq: string): string {
  return seq
    .toUpperCase()
    .split('')
    .reverse()
    .map((b) => RC_TABLE[b] ?? b)
    .join('')
}

// ── Overlap scoring ──────────────────────────────────────────────────────────

/**
 * Score an overlap of `suffix` (end of upstream read) against `prefix`
 * (beginning of downstream read).
 *
 * Per-position rules (both strings must have equal length):
 *   exact match               → +1
 *   IUPAC-compatible near-match → +0.5 (if not exact but sets intersect)
 *   N or gap character (-)    → 0
 *   mismatch                  → −1
 *
 * Returns the raw numeric sum.
 */
export function scoreOverlap(suffix: string, prefix: string): number {
  if (suffix.length !== prefix.length) return 0
  let score = 0
  for (let i = 0; i < suffix.length; i++) {
    const a = suffix[i].toUpperCase()
    const b = prefix[i].toUpperCase()
    if (a === 'N' || a === '-' || b === 'N' || b === '-') {
      // N or gap — no contribution
      continue
    }
    if (a === b) {
      score += 1
    } else if (iupacCompatible(a, b)) {
      score += 0.5
    } else {
      score -= 1
    }
  }
  return score
}

// ── Overlap candidate ────────────────────────────────────────────────────────

export interface OverlapCandidate {
  /** The upstream read sequence (as-used, oriented). */
  upstreamSeq: string
  /** The downstream read sequence (as-used, oriented). */
  downstreamSeq: string
  /** Number of overlapping bases. */
  overlapLength: number
  /** Raw overlap score from scoreOverlap. */
  score: number
  /**
   * Orientation tag:
   *   'fwd'    — seqA is upstream as-is,    seqB is downstream as-is
   *   'fwd-rc' — seqA is upstream as-is,    seqB is downstream as RC
   *   'rev'    — seqB is upstream as-is,    seqA is downstream as-is
   *   'rev-rc' — seqB is upstream as-is,    seqA is downstream as RC
   */
  orientation: 'fwd' | 'fwd-rc' | 'rev' | 'rev-rc'
  /** True when seqA is used as the upstream (left) read. */
  fwdIsA: boolean
}

/**
 * Find the best pairwise overlap between seqA and seqB.
 *
 * Tries all four orientation pairings:
 *   1. A (as-is) → B (as-is)
 *   2. A (as-is) → B (rc)
 *   3. B (as-is) → A (as-is)
 *   4. B (as-is) → A (rc)
 *
 * For each pairing, evaluates every overlap length from `minOverlap` (default 20)
 * to `min(upstreamLen, downstreamLen)` and keeps the best-scoring length.
 *
 * Returns null when no positive-scoring overlap is found.
 */
export function findBestOverlap(
  seqA: string,
  seqB: string,
  minOverlap = 20,
): OverlapCandidate | null {
  const seqArc = reverseComplement(seqA)
  const seqBrc = reverseComplement(seqB)

  const orientations: Array<{
    upstream: string
    downstream: string
    orientation: OverlapCandidate['orientation']
    fwdIsA: boolean
  }> = [
    { upstream: seqA, downstream: seqB,   orientation: 'fwd',    fwdIsA: true  },
    { upstream: seqA, downstream: seqBrc, orientation: 'fwd-rc', fwdIsA: true  },
    { upstream: seqB, downstream: seqA,   orientation: 'rev',    fwdIsA: false },
    { upstream: seqB, downstream: seqArc, orientation: 'rev-rc', fwdIsA: false },
  ]

  let best: OverlapCandidate | null = null

  for (const { upstream, downstream, orientation, fwdIsA } of orientations) {
    const maxOverlap = Math.min(upstream.length, downstream.length)
    for (let k = minOverlap; k <= maxOverlap; k++) {
      const suffix = upstream.slice(-k)
      const prefix = downstream.slice(0, k)
      const score = scoreOverlap(suffix, prefix)
      if (best === null || score > best.score) {
        best = { upstreamSeq: upstream, downstreamSeq: downstream, overlapLength: k, score, orientation, fwdIsA }
      }
    }
  }

  // Return null if the best score is non-positive (no useful overlap).
  if (best === null || best.score <= 0) return null
  return best
}
