/**
 * pcr.ts — In-silico PCR amplicon prediction (linear + circular templates).
 *
 * Logic:
 *  1. Accept a list of forward binding sites and reverse binding sites on a template.
 *  2. Pair every forward site with every reverse site where the reverse site is
 *     downstream (start_rev > start_fwd on a linear template), or wraps around
 *     on a circular template.
 *  3. Filter by a configurable max-amplicon size.
 *  4. Rank by ascending size, then ascending total mismatches.
 */

import type { PrimerBindingSite, PredictedAmplicon } from '../types/primer'

let _ampliconId = 0
function nextId(): string {
  return `amp-${++_ampliconId}`
}

/**
 * Predict PCR amplicons from pre-computed forward + reverse binding sites.
 *
 * For a linear template a valid amplicon requires:
 *   forward site (top strand, 5′→3′) upstream of reverse site (bottom strand).
 *   The reverse primer site is recorded with `strand:'reverse'`, meaning the
 *   primer's 3′ end points *leftward* (toward the forward primer), so the
 *   amplicon runs from fwd.start to rev.end.
 *
 * For a circular template the amplicon may wrap: rev.start < fwd.end
 * and the size = (templateLength - fwd.start + 1) + rev.end.
 *
 * @param fwdSites       Forward binding sites (strand === 'forward').
 * @param revSites       Reverse binding sites (strand === 'reverse').
 * @param templateSeq    Full template sequence (uppercase DNA).
 * @param circular       Whether the template is circular (default false).
 * @param maxSize        Maximum amplicon size to report (default 5000 bp).
 * @returns              Predicted amplicons sorted by size ascending.
 */
export function predictAmplicons(
  fwdSites: PrimerBindingSite[],
  revSites: PrimerBindingSite[],
  templateSeq: string,
  circular = false,
  maxSize = 5000,
): PredictedAmplicon[] {
  const amplicons: PredictedAmplicon[] = []
  const tLen = templateSeq.length

  for (const fwd of fwdSites) {
    if (fwd.strand !== 'forward') continue

    for (const rev of revSites) {
      if (rev.strand !== 'reverse') continue

      // ── Linear amplicon ───────────────────────────────────────────────────
      // rev.start > fwd.start means the reverse primer sits downstream.
      // The amplicon spans from fwd.start (1-based) to rev.end (1-based).
      if (rev.start > fwd.start) {
        const size = rev.end - fwd.start + 1
        if (size <= maxSize) {
          const seq = templateSeq.slice(fwd.start - 1, rev.end)
          amplicons.push({
            id: nextId(),
            forwardSiteStart: fwd.start,
            reverseSiteEnd: rev.end,
            size,
            circularWrap: false,
            mismatches: { forward: fwd.mismatches, reverse: rev.mismatches },
            sequence: seq,
          })
        }
      }

      // ── Circular wrap-around amplicon ─────────────────────────────────────
      // The forward primer is downstream of the reverse primer (rev.end < fwd.start).
      // Amplicon: [fwd.start..tLen] + [1..rev.end]
      if (circular && rev.end < fwd.start) {
        const size = (tLen - fwd.start + 1) + rev.end
        if (size <= maxSize && size > 0) {
          const seq = templateSeq.slice(fwd.start - 1) + templateSeq.slice(0, rev.end)
          amplicons.push({
            id: nextId(),
            forwardSiteStart: fwd.start,
            reverseSiteEnd: rev.end,
            size,
            circularWrap: true,
            mismatches: { forward: fwd.mismatches, reverse: rev.mismatches },
            sequence: seq,
          })
        }
      }
    }
  }

  // Sort: ascending size, then ascending total mismatches.
  amplicons.sort((a, b) => {
    const sizeDiff = a.size - b.size
    if (sizeDiff !== 0) return sizeDiff
    const mA = a.mismatches.forward + a.mismatches.reverse
    const mB = b.mismatches.forward + b.mismatches.reverse
    return mA - mB
  })

  return amplicons
}

/**
 * Export a predicted amplicon as a FASTA string.
 */
export function ampliconToFasta(
  amplicon: PredictedAmplicon,
  forwardName: string,
  reverseName: string,
): string {
  const wrap = amplicon.circularWrap ? ' [circular wrap]' : ''
  const header = `>amplicon [${forwardName} + ${reverseName}] ${amplicon.size} bp${wrap} fwd=${amplicon.forwardSiteStart} rev=${amplicon.reverseSiteEnd}`
  const lines: string[] = [header]
  for (let i = 0; i < amplicon.sequence.length; i += 80) {
    lines.push(amplicon.sequence.slice(i, i + 80))
  }
  return lines.join('\n') + '\n'
}
