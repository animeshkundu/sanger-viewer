/**
 * binding.ts — Mismatch-tolerant primer binding-site search.
 *
 * Search strategy:
 *  - Slide the primer along the template in both orientations.
 *  - Count mismatches using a per-base IUPAC compatibility check.
 *  - Apply a stricter 0-mismatch rule on the last `THREE_END_STRICT` bases.
 *  - Return all sites within the configured mismatch tolerance.
 *
 * 1-based positions are used throughout to match the VCF / lab convention.
 */

import type { PrimerBindingSite } from '../types/primer'

/** Number of 3′-terminal bases where mismatches are not tolerated. */
const THREE_END_STRICT = 3

/**
 * IUPAC compatibility table — returns true when `read` is compatible with
 * the IUPAC ambiguity code `ref` (or vice-versa when both may be IUPAC).
 */
const IUPAC_SETS: Record<string, Set<string>> = {
  A: new Set(['A']),
  C: new Set(['C']),
  G: new Set(['G']),
  T: new Set(['T']),
  R: new Set(['A', 'G']),
  Y: new Set(['C', 'T']),
  S: new Set(['G', 'C']),
  W: new Set(['A', 'T']),
  K: new Set(['G', 'T']),
  M: new Set(['A', 'C']),
  B: new Set(['C', 'G', 'T']),
  D: new Set(['A', 'G', 'T']),
  H: new Set(['A', 'C', 'T']),
  V: new Set(['A', 'C', 'G']),
  N: new Set(['A', 'C', 'G', 'T']),
}

function basesCompatible(a: string, b: string): boolean {
  const setA = IUPAC_SETS[a.toUpperCase()]
  const setB = IUPAC_SETS[b.toUpperCase()]
  if (!setA || !setB) return false
  for (const base of setA) {
    if (setB.has(base)) return true
  }
  return false
}

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', N: 'N',
  R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M',
  M: 'K', B: 'V', V: 'B', D: 'H', H: 'D',
}

function reverseComplement(seq: string): string {
  return seq.toUpperCase().split('').reverse().map((b) => COMPLEMENT[b] ?? 'N').join('')
}

/**
 * Score one primer alignment at a specific offset on the template strand.
 * Returns { mismatches, threeEndMismatches } — or null if the site overruns
 * the template or exceeds the tolerance.
 */
function scoreSite(
  primer: string,
  template: string,
  templateOffset: number,
  maxMismatches: number,
): { mismatches: number; threeEndMismatches: number } | null {
  const pLen = primer.length
  if (templateOffset < 0 || templateOffset + pLen > template.length) return null

  let mismatches = 0
  let threeEndMismatches = 0
  const threeEndStart = pLen - THREE_END_STRICT

  for (let k = 0; k < pLen; k++) {
    if (!basesCompatible(primer[k], template[templateOffset + k])) {
      mismatches++
      if (k >= threeEndStart) {
        threeEndMismatches++
        return null  // 3′ mismatch — reject immediately
      }
      if (mismatches > maxMismatches) return null
    }
  }

  return { mismatches, threeEndMismatches }
}

/**
 * Search a template for all binding sites of a primer.
 *
 * A forward primer binds the top (template) strand 5′→3′.
 * A reverse primer binds the bottom strand — equivalent to matching the
 * reverse-complement of the primer against the top strand (reading right-to-left).
 *
 * @param primerId       ID of the PrimerEntry.
 * @param primerSeq      Primer sequence (5′→3′).
 * @param templateSeq    Template sequence (uppercase DNA).
 * @param maxMismatches  Maximum total mismatches allowed (exclusive of 3′ end).
 * @returns              Array of PrimerBindingSite (1-based coordinates).
 */
export function findPrimerBindingSites(
  primerId: string,
  primerSeq: string,
  templateSeq: string,
  maxMismatches = 2,
): PrimerBindingSite[] {
  const sites: PrimerBindingSite[] = []
  const tLen  = templateSeq.length
  const pLen  = primerSeq.length

  // ── Forward: primer binds top strand ────────────────────────────────────────
  for (let i = 0; i + pLen <= tLen; i++) {
    const score = scoreSite(primerSeq, templateSeq, i, maxMismatches)
    if (score) {
      sites.push({
        primerId,
        strand: 'forward',
        start: i + 1,         // 1-based
        end:   i + pLen,      // 1-based inclusive
        mismatches: score.mismatches,
        threeEndMismatches: score.threeEndMismatches,
      })
    }
  }

  // ── Reverse: primer binds bottom strand ─────────────────────────────────────
  // Match RC(primer) against the top strand, then record 1-based site.
  const rcPrimer = reverseComplement(primerSeq)
  for (let i = 0; i + pLen <= tLen; i++) {
    const score = scoreSite(rcPrimer, templateSeq, i, maxMismatches)
    if (score) {
      sites.push({
        primerId,
        strand: 'reverse',
        start: i + 1,
        end:   i + pLen,
        mismatches: score.mismatches,
        threeEndMismatches: score.threeEndMismatches,
      })
    }
  }

  return sites
}
