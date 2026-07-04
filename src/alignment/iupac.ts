/**
 * iupac.ts — IUPAC nucleotide utilities for alignment scoring.
 *
 * Provides an IUPAC-aware match/mismatch scoring function so that
 * ambiguity codes in either the read or the reference receive partial credit.
 */

/** Full IUPAC expansion table (uppercase). */
const IUPAC_EXPAND: Record<string, readonly string[]> = {
  A: ['A'],
  C: ['C'],
  G: ['G'],
  T: ['T'],
  U: ['T'],
  R: ['A', 'G'],
  Y: ['C', 'T'],
  S: ['C', 'G'],
  W: ['A', 'T'],
  K: ['G', 'T'],
  M: ['A', 'C'],
  B: ['C', 'G', 'T'],
  D: ['A', 'G', 'T'],
  H: ['A', 'C', 'T'],
  V: ['A', 'C', 'G'],
  N: ['A', 'C', 'G', 'T'],
}

/**
 * Return the canonical bases represented by an IUPAC code.
 * Unknown characters return an empty array.
 */
export function iupacBases(code: string): readonly string[] {
  return IUPAC_EXPAND[code.toUpperCase()] ?? []
}

/**
 * IUPAC-aware similarity check.
 * Returns true when the two codes share at least one canonical base.
 */
export function iupacMatch(a: string, b: string): boolean {
  const ba = iupacBases(a)
  const bb = iupacBases(b)
  for (const x of ba) {
    if (bb.includes(x)) return true
  }
  return false
}

/**
 * Score for aligning base `read` against base `ref`.
 *  +2  exact match (both single-base)
 *  +1  IUPAC partial match (ambiguity on either side)
 *  -1  mismatch
 */
export function iupacScore(read: string, ref: string): number {
  const r = read.toUpperCase()
  const f = ref.toUpperCase()
  if (!IUPAC_EXPAND[r] || !IUPAC_EXPAND[f]) return -1
  if (!iupacMatch(r, f)) return -1
  // Exact match only when both are the same unambiguous base.
  const isExact = IUPAC_EXPAND[r].length === 1 && IUPAC_EXPAND[f].length === 1 && r === f
  return isExact ? 2 : 1
}

/** IUPAC complement (uppercase). */
const IUPAC_COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', C: 'G', G: 'C', U: 'A',
  R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K',
  B: 'V', V: 'B', D: 'H', H: 'D', N: 'N',
}

/** Return the IUPAC complement of a single base (uppercase). Returns 'N' for unknowns. */
export function iupacComplement(base: string): string {
  return IUPAC_COMPLEMENT[base.toUpperCase()] ?? 'N'
}

/** Reverse-complement a DNA sequence (IUPAC-aware). */
export function reverseComplement(seq: string): string {
  return [...seq.toUpperCase()]
    .reverse()
    .map((b) => IUPAC_COMPLEMENT[b] ?? 'N')
    .join('')
}
