/**
 * filter.ts — Filter and sort utilities for CalledVariant arrays.
 */

import type { CalledVariant } from '../types/alignment'

export type VariantFilterMode = 'all' | 'high' | 'ambiguous' | 'indel'

/**
 * Filter a variant list by the given mode, excluding suppressed variants.
 *
 * @param variants  Full variant list.
 * @param mode      Filter mode.
 * @param includeSuppressed  When true, suppressed variants are included (e.g. for display with strikethrough).
 */
export function filterVariants(
  variants: CalledVariant[],
  mode: VariantFilterMode,
  includeSuppressed = false,
): CalledVariant[] {
  return variants.filter((v) => {
    if (!includeSuppressed && v.review === 'suppressed') return false
    if (mode === 'all') return true
    if (mode === 'high') return v.confidence === 'high'
    if (mode === 'ambiguous') return v.type === 'ambiguous'
    if (mode === 'indel') return v.type === 'insertion' || v.type === 'deletion'
    return true
  })
}

/**
 * Count variants by review state.
 */
export function countByReview(variants: CalledVariant[]): {
  unreviewed: number
  accepted: number
  uncertain: number
  suppressed: number
} {
  const counts = { unreviewed: 0, accepted: 0, uncertain: 0, suppressed: 0 }
  for (const v of variants) counts[v.review]++
  return counts
}

/**
 * Count variants by type (excluding suppressed).
 */
export function countByType(variants: CalledVariant[]): {
  snv: number
  insertion: number
  deletion: number
  ambiguous: number
} {
  const counts = { snv: 0, insertion: 0, deletion: 0, ambiguous: 0 }
  for (const v of variants) {
    if (v.review !== 'suppressed') counts[v.type]++
  }
  return counts
}
