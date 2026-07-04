/**
 * variants.ts — CSV and VCF-lite TSV export for CalledVariant lists.
 *
 * Export functions produce deterministic byte strings suitable for unit testing.
 * Suppressed variants are always excluded from exports.
 *
 * Ground spec: docs/specs/08-variant-calling-review.md
 */

import type { CalledVariant } from '../types/alignment'

const CSV_HEADER = 'position,ref,alt,type,confidence,review'
const VCF_HEADER = '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO'

/**
 * Serialize a filtered variant list to CSV.
 * Suppressed variants are excluded.
 * Column order: position, ref, alt, type, confidence, review.
 *
 * @param variants  Full or pre-filtered variant list.
 * @param refName   Reference name for metadata comment (optional).
 * @returns UTF-8 CSV string ending with a newline.
 */
export function toVariantsCsv(variants: CalledVariant[], refName = ''): string {
  const rows = variants
    .filter((v) => v.review !== 'suppressed')
    .map((v) => `${v.position},${v.ref},${v.alt},${v.type},${v.confidence},${v.review}`)

  const meta = refName ? `# reference: ${refName}\n` : ''
  return `${meta}${CSV_HEADER}\n${rows.join('\n')}${rows.length > 0 ? '\n' : ''}`
}

/**
 * Serialize a filtered variant list to VCF-lite TSV (no genotype column).
 * Suppressed variants are excluded.
 * Columns: CHROM, POS, ID, REF, ALT, QUAL, FILTER, INFO.
 *
 * @param variants  Full or pre-filtered variant list.
 * @param refName   Reference name used as CHROM.
 * @returns UTF-8 TSV string ending with a newline.
 */
export function toVariantsVcf(variants: CalledVariant[], refName = 'ref'): string {
  const filtered = variants.filter((v) => v.review !== 'suppressed')
  const rows = filtered.map((v) => {
    const chrom = refName
    const pos = String(v.position)
    const id = v.id
    const ref = v.ref === '-' ? '.' : v.ref
    const alt = v.alt === '-' ? '.' : v.alt
    const qual = '.'
    const filter = v.confidence === 'high' ? 'PASS' : '.'
    const info = `TYPE=${v.type.toUpperCase()};CONFIDENCE=${v.confidence.toUpperCase()};REVIEW=${v.review.toUpperCase()}`
    return [chrom, pos, id, ref, alt, qual, filter, info].join('\t')
  })
  return `${VCF_HEADER}\n${rows.join('\n')}${rows.length > 0 ? '\n' : ''}`
}
