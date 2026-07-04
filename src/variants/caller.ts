/**
 * caller.ts — Variant caller derived from a ReferenceAlignment.
 *
 * Walks the CIGAR string base-by-base and emits CalledVariant records for:
 *   - SNVs (M op, read ≠ ref, unambiguous bases)
 *   - Ambiguous variants (M op, read is IUPAC ambiguity code)
 *   - Insertions (I op)
 *   - Deletions (D op)
 *
 * Ground spec: docs/specs/08-variant-calling-review.md
 */

import type { ReferenceAlignment } from '../types/alignment'
import type { CalledVariant } from '../types/alignment'
import { iupacBases, iupacMatch } from '../alignment/iupac'
import { parseCigar } from '../alignment/cigar'

/** Unambiguous single bases. */
const UNAMBIGUOUS = new Set(['A', 'C', 'G', 'T'])

function isAmbiguous(base: string): boolean {
  return !UNAMBIGUOUS.has(base.toUpperCase()) && base.toUpperCase() !== 'N'
}

function makeVariantId(alignmentId: string, position: number, ref: string, alt: string): string {
  return `${alignmentId}:${position}:${ref}:${alt}`
}

/**
 * Call variants from a ReferenceAlignment and the aligned read + reference sequences.
 *
 * @param alignment     The alignment result from alignReadToReference.
 * @param readSeq       The read sequence (in the strand orientation that was aligned).
 * @param refSeq        The full reference sequence (0-based).
 * @param qualities     Per-base PHRED qualities for the read (may be null).
 * @returns Deterministic array of CalledVariant (ordered by position).
 */
export function callVariants(
  alignment: ReferenceAlignment,
  readSeq: string,
  refSeq: string,
  qualities: number[] | null = null,
): CalledVariant[] {
  const variants: CalledVariant[] = []
  const cigar = parseCigar(alignment.cigar)
  const refStart0 = alignment.refStart - 1   // 0-based

  let readPos = 0
  let refOffset = 0   // offset from refStart0

  for (const seg of cigar) {
    for (let k = 0; k < seg.len; k++) {
      const refPos1 = refStart0 + refOffset + 1   // 1-based
      const readBase = readSeq[readPos]?.toUpperCase() ?? 'N'
      const refBase = refSeq[refStart0 + refOffset]?.toUpperCase() ?? 'N'

      if (seg.op === 'M') {
        // Skip if either is N (unknown)
        if (readBase !== 'N' && refBase !== 'N') {
          const readIsAmbig = isAmbiguous(readBase)
          const refIsAmbig = isAmbiguous(refBase)

          if (readIsAmbig) {
            // Ambiguous read base — emit as ambiguous variant if it could be different
            const readBases = iupacBases(readBase)
            const refBases = iupacBases(refBase)
            const couldDiffer = readBases.some((b) => !refBases.includes(b))
            if (couldDiffer) {
              const qual = qualities?.[readPos] ?? null
              const confidence = qual !== null ? (qual >= 20 ? 'medium' : 'low') : 'low'
              variants.push({
                id: makeVariantId(alignment.id, refPos1, refBase, readBase),
                alignmentId: alignment.id,
                position: refPos1,
                ref: refBase,
                alt: readBase,
                type: 'ambiguous',
                confidence,
                readIndex: readPos,
                review: 'unreviewed',
              })
            }
          } else if (!refIsAmbig) {
            // Both unambiguous — clean SNV if they differ
            if (readBase !== refBase) {
              const qual = qualities?.[readPos] ?? null
              const confidence = qual !== null ? (qual >= 30 ? 'high' : qual >= 20 ? 'medium' : 'low') : 'medium'
              variants.push({
                id: makeVariantId(alignment.id, refPos1, refBase, readBase),
                alignmentId: alignment.id,
                position: refPos1,
                ref: refBase,
                alt: readBase,
                type: 'snv',
                confidence,
                readIndex: readPos,
                review: 'unreviewed',
              })
            }
          } else {
            // refIsAmbig but readBase is unambiguous — check if read matches ref exactly
            if (!iupacMatch(readBase, refBase)) {
              const qual = qualities?.[readPos] ?? null
              const confidence = qual !== null ? (qual >= 30 ? 'high' : 'medium') : 'medium'
              variants.push({
                id: makeVariantId(alignment.id, refPos1, refBase, readBase),
                alignmentId: alignment.id,
                position: refPos1,
                ref: refBase,
                alt: readBase,
                type: 'snv',
                confidence,
                readIndex: readPos,
                review: 'unreviewed',
              })
            }
          }
        }
        readPos++
        refOffset++
      } else if (seg.op === 'I') {
        // Insertion: k consecutive inserted bases — emit one record per run
        // We emit a single record for the start of the insertion.
        // Only emit on the first base of the insertion segment.
        if (k === 0) {
          // Collect all bases in this I run
          const insertedBases = readSeq.slice(readPos, readPos + seg.len).toUpperCase()
          const qual = qualities ? Math.min(...qualities.slice(readPos, readPos + seg.len)) : null
          const confidence = qual !== null ? (qual >= 20 ? 'medium' : 'low') : 'low'
          variants.push({
            id: makeVariantId(alignment.id, refPos1, '-', insertedBases),
            alignmentId: alignment.id,
            position: refPos1,
            ref: '-',
            alt: insertedBases,
            type: 'insertion',
            confidence,
            readIndex: readPos,
            review: 'unreviewed',
          })
        }
        readPos++
        // refOffset does not advance on insertions
      } else if (seg.op === 'D') {
        // Deletion: emit one record per run on first base
        if (k === 0) {
          const deletedBases = refSeq.slice(refStart0 + refOffset, refStart0 + refOffset + seg.len).toUpperCase()
          variants.push({
            id: makeVariantId(alignment.id, refPos1, deletedBases, '-'),
            alignmentId: alignment.id,
            position: refPos1,
            ref: deletedBases,
            alt: '-',
            type: 'deletion',
            confidence: 'low',
            readIndex: -1,
            review: 'unreviewed',
          })
        }
        refOffset++
        // readPos does not advance on deletions
      }
    }
  }

  // Sort by position, then by type
  variants.sort((a, b) => a.position - b.position || a.type.localeCompare(b.type))

  // Deduplicate by id (can occur if the same variant is emitted twice due to band edge)
  const seen = new Set<string>()
  return variants.filter((v) => {
    if (seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
}
