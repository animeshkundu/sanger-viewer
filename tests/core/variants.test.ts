/**
 * variants.test.ts — Exact-value unit tests for variant calling,
 * filter utilities, and CSV/VCF export bytes.
 *
 * Ground spec: docs/specs/08-variant-calling-review.md
 */

import { describe, expect, it } from 'vitest'
import { callVariants } from '../../src/variants/caller'
import { filterVariants, countByType } from '../../src/variants/filter'
import { toVariantsCsv, toVariantsVcf } from '../../src/export/variants'
import { alignReadToReference } from '../../src/alignment/aligner'
import type { CalledVariant, ReferenceAlignment } from '../../src/types/alignment'

// ── Helper: build a minimal ReferenceAlignment for testing ──────────────────

function makeAlignment(overrides: Partial<ReferenceAlignment> = {}): ReferenceAlignment {
  return {
    id: 'test-aln',
    subjectId: 'slot1',
    referenceId: 'ref',
    strand: 'forward',
    refStart: 1,
    refEnd: 10,
    cigar: '10M',
    score: 20,
    mismatches: [],
    insertions: [],
    deletions: [],
    ...overrides,
  }
}

// ── callVariants — exact variant list tests ──────────────────────────────────

describe('callVariants', () => {
  it('returns empty array when read and reference match perfectly', () => {
    const ref = 'ACGTACGTAC'
    const read = 'ACGTACGTAC'
    const aln = makeAlignment({ cigar: '10M', refStart: 1, refEnd: 10 })
    const variants = callVariants(aln, read, ref)
    expect(variants).toHaveLength(0)
  })

  it('EXACT: single SNV at known 1-based position', () => {
    // ref:  ACGTACGTAC
    // read: ACTTACGTAC  (G→T at position 3)
    const ref = 'ACGTACGTAC'
    const read = 'ACTTACGTAC'
    const aln = makeAlignment({ cigar: '10M', refStart: 1, refEnd: 10 })
    const variants = callVariants(aln, read, ref)

    const snv = variants.find((v) => v.type === 'snv')
    expect(snv).toBeDefined()
    expect(snv!.position).toBe(3)          // 1-based position in reference
    expect(snv!.ref).toBe('G')
    expect(snv!.alt).toBe('T')
    expect(snv!.review).toBe('unreviewed')
  })

  it('EXACT: two SNVs at correct positions', () => {
    // ref:  ACGTACGT
    // read: ACTTACCT  (G→T at pos 3, G→C at pos 7)
    const ref = 'ACGTACGT'
    const read = 'ACTTACCT'
    const aln = makeAlignment({ cigar: '8M', refStart: 1, refEnd: 8 })
    const variants = callVariants(aln, read, ref)
    const snvs = variants.filter((v) => v.type === 'snv')
    expect(snvs).toHaveLength(2)

    const positions = snvs.map((v) => v.position).sort((a, b) => a - b)
    expect(positions).toEqual([3, 7])
  })

  it('EXACT: insertion is called with correct alt bases', () => {
    // ref:  ACGT
    // read: ACGGT  (insertion of G before pos 4)
    // cigar: 3M1I1M
    const ref = 'ACGT'
    const read = 'ACGGT'
    const aln = makeAlignment({ cigar: '3M1I1M', refStart: 1, refEnd: 4 })
    const variants = callVariants(aln, read, ref)
    const ins = variants.find((v) => v.type === 'insertion')
    expect(ins).toBeDefined()
    expect(ins!.alt).toBe('G')
    expect(ins!.ref).toBe('-')
  })

  it('EXACT: deletion is called with correct ref bases', () => {
    // ref:  ACGGT
    // read: ACGT   (deletion of G at pos 3)
    // cigar: 2M1D2M
    const ref = 'ACGGT'
    const read = 'ACGT'
    const aln = makeAlignment({ cigar: '2M1D2M', refStart: 1, refEnd: 5 })
    const variants = callVariants(aln, read, ref)
    const del = variants.find((v) => v.type === 'deletion')
    expect(del).toBeDefined()
    expect(del!.ref).toBe('G')
    expect(del!.alt).toBe('-')
  })

  it('EXACT: ambiguous read base produces ambiguous variant', () => {
    // ref:  ACGTACGT
    // read: ACRTACGT  (R = A|G at pos 3 — ambiguous vs G)
    const ref = 'ACGTACGT'
    const read = 'ACRTACGT'
    const aln = makeAlignment({ cigar: '8M', refStart: 1, refEnd: 8 })
    const variants = callVariants(aln, read, ref)
    const ambig = variants.find((v) => v.type === 'ambiguous')
    expect(ambig).toBeDefined()
    expect(ambig!.position).toBe(3)
    expect(ambig!.alt).toBe('R')
  })

  it('produces deterministic variant IDs', () => {
    const ref = 'ACGTACGT'
    const read = 'ACTTACGT'
    const aln = makeAlignment({ id: 'fixed-id', cigar: '8M', refStart: 1, refEnd: 8 })
    const variants = callVariants(aln, read, ref)
    expect(variants[0].id).toBe('fixed-id:3:G:T')
  })

  it('variants are sorted by position', () => {
    const ref = 'ACGTACGT'
    const read = 'TCGTACGC'  // pos 1: A→T, pos 8: T→C
    const aln = makeAlignment({ cigar: '8M', refStart: 1, refEnd: 8 })
    const variants = callVariants(aln, read, ref)
    const positions = variants.map((v) => v.position)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('EXACT: full-length known read+reference → exact variant list', () => {
    // Reference: AAACCCGGGTTT
    // Read:      AAATCCGGGTTT  (C→T at position 4)
    const ref = 'AAACCCGGGTTT'
    const read = 'AAATCCGGGTTT'
    const aln = makeAlignment({ cigar: '12M', refStart: 1, refEnd: 12 })
    const variants = callVariants(aln, read, ref)
    expect(variants).toHaveLength(1)
    expect(variants[0].position).toBe(4)
    expect(variants[0].ref).toBe('C')
    expect(variants[0].alt).toBe('T')
    expect(variants[0].type).toBe('snv')
  })

  it('high-quality base call gets high confidence', () => {
    const ref = 'ACGT'
    const read = 'ACTT'
    const aln = makeAlignment({ cigar: '4M', refStart: 1, refEnd: 4 })
    const qualities = [40, 40, 40, 40]
    const variants = callVariants(aln, read, ref, qualities)
    expect(variants[0].confidence).toBe('high')
  })

  it('low-quality base call gets low or medium confidence', () => {
    const ref = 'ACGT'
    const read = 'ACTT'
    const aln = makeAlignment({ cigar: '4M', refStart: 1, refEnd: 4 })
    const qualities = [40, 40, 10, 40]  // Q10 at the mismatch position
    const variants = callVariants(aln, read, ref, qualities)
    expect(variants[0].confidence).toBe('low')
  })
})

// ── Integration: alignReadToReference + callVariants ─────────────────────────

describe('alignReadToReference → callVariants integration', () => {
  it('EXACT: known read+ref pipeline produces correct SNV position and bases', () => {
    const reference = 'AAACCCGGGTTT'
    const read = 'AAATCCGGGTTT'   // substitution at pos 4: C→T
    const aln = alignReadToReference(read, reference, 'ref', 'slot1')
    const variants = callVariants(aln, read, reference)

    expect(aln.strand).toBe('forward')
    expect(aln.refStart).toBe(1)
    expect(aln.refEnd).toBe(12)

    const snvs = variants.filter((v) => v.type === 'snv')
    expect(snvs).toHaveLength(1)
    expect(snvs[0].position).toBe(4)
    expect(snvs[0].ref).toBe('C')
    expect(snvs[0].alt).toBe('T')
  })

  it('EXACT: read placed inside longer reference — position offset is correct', () => {
    // Reference: NNNACGTNNN, Read: ACGT → refStart=4
    // No variants since it's a perfect match
    const reference = 'NNNACGTNNN'
    const read = 'ACGT'
    const aln = alignReadToReference(read, reference, 'ref', 'slot1')
    expect(aln.refStart).toBe(4)
    const variants = callVariants(aln, read, reference)
    // Only N-vs-unambiguous positions, no real variants
    expect(variants.filter((v) => v.type === 'snv')).toHaveLength(0)
  })
})

// ── filterVariants ────────────────────────────────────────────────────────────

describe('filterVariants', () => {
  const makeVariant = (overrides: Partial<CalledVariant>): CalledVariant => ({
    id: 'v1', alignmentId: 'aln', position: 1, ref: 'A', alt: 'T',
    type: 'snv', confidence: 'high', readIndex: 0, review: 'unreviewed',
    ...overrides,
  })

  it('all — returns all non-suppressed variants', () => {
    const variants = [
      makeVariant({ id: 'v1', review: 'unreviewed' }),
      makeVariant({ id: 'v2', review: 'accepted' }),
      makeVariant({ id: 'v3', review: 'suppressed' }),
    ]
    const result = filterVariants(variants, 'all')
    expect(result).toHaveLength(2)
    expect(result.find((v) => v.id === 'v3')).toBeUndefined()
  })

  it('high — returns only high-confidence non-suppressed variants', () => {
    const variants = [
      makeVariant({ id: 'v1', confidence: 'high' }),
      makeVariant({ id: 'v2', confidence: 'medium' }),
      makeVariant({ id: 'v3', confidence: 'low' }),
    ]
    expect(filterVariants(variants, 'high')).toHaveLength(1)
    expect(filterVariants(variants, 'high')[0].id).toBe('v1')
  })

  it('ambiguous — returns only ambiguous variants', () => {
    const variants = [
      makeVariant({ id: 'v1', type: 'snv' }),
      makeVariant({ id: 'v2', type: 'ambiguous' }),
    ]
    expect(filterVariants(variants, 'ambiguous')).toHaveLength(1)
    expect(filterVariants(variants, 'ambiguous')[0].id).toBe('v2')
  })

  it('indel — returns insertions and deletions', () => {
    const variants = [
      makeVariant({ id: 'v1', type: 'snv' }),
      makeVariant({ id: 'v2', type: 'insertion' }),
      makeVariant({ id: 'v3', type: 'deletion' }),
    ]
    const result = filterVariants(variants, 'indel')
    expect(result).toHaveLength(2)
    const types = result.map((v) => v.type)
    expect(types).toContain('insertion')
    expect(types).toContain('deletion')
  })

  it('includeSuppressed=true includes suppressed variants', () => {
    const variants = [makeVariant({ id: 'v1', review: 'suppressed' })]
    expect(filterVariants(variants, 'all', true)).toHaveLength(1)
  })
})

// ── countByType ───────────────────────────────────────────────────────────────

describe('countByType', () => {
  it('counts variants by type excluding suppressed', () => {
    const makeVariant = (type: CalledVariant['type'], review: CalledVariant['review'] = 'unreviewed'): CalledVariant => ({
      id: 'v', alignmentId: 'aln', position: 1, ref: 'A', alt: 'T',
      type, confidence: 'high', readIndex: 0, review,
    })
    const variants = [
      makeVariant('snv'),
      makeVariant('snv'),
      makeVariant('insertion'),
      makeVariant('deletion'),
      makeVariant('ambiguous'),
      makeVariant('snv', 'suppressed'),   // excluded
    ]
    const counts = countByType(variants)
    expect(counts.snv).toBe(2)
    expect(counts.insertion).toBe(1)
    expect(counts.deletion).toBe(1)
    expect(counts.ambiguous).toBe(1)
  })
})

// ── toVariantsCsv — exact byte output ─────────────────────────────────────────

describe('toVariantsCsv', () => {
  const makeVariant = (overrides: Partial<CalledVariant> = {}): CalledVariant => ({
    id: 'test-aln:3:G:T', alignmentId: 'test-aln', position: 3,
    ref: 'G', alt: 'T', type: 'snv', confidence: 'high',
    readIndex: 2, review: 'unreviewed',
    ...overrides,
  })

  it('EXACT: single SNV CSV output matches expected bytes', () => {
    const variants = [makeVariant()]
    const csv = toVariantsCsv(variants, 'myref')
    expect(csv).toBe('# reference: myref\nposition,ref,alt,type,confidence,review\n3,G,T,snv,high,unreviewed\n')
  })

  it('EXACT: empty variant list produces header only', () => {
    const csv = toVariantsCsv([], 'ref')
    expect(csv).toBe('# reference: ref\nposition,ref,alt,type,confidence,review\n')
  })

  it('excludes suppressed variants', () => {
    const variants = [
      makeVariant({ id: 'v1' }),
      makeVariant({ id: 'v2', review: 'suppressed' }),
    ]
    const csv = toVariantsCsv(variants)
    expect(csv).not.toContain('suppressed')
    expect(csv.split('\n').filter((l) => !l.startsWith('#') && l.trim() && !l.startsWith('position'))).toHaveLength(1)
  })

  it('CSV header is exactly position,ref,alt,type,confidence,review', () => {
    const csv = toVariantsCsv([makeVariant()])
    const headerLine = csv.split('\n').find((l) => l.startsWith('position'))
    expect(headerLine).toBe('position,ref,alt,type,confidence,review')
  })

  it('accepted variant is included in CSV', () => {
    const variants = [makeVariant({ review: 'accepted' })]
    const csv = toVariantsCsv(variants)
    expect(csv).toContain('accepted')
  })

  it('EXACT: insertion variant has correct ref=- and alt bases', () => {
    const ins: CalledVariant = {
      id: 'aln:5:-:GG', alignmentId: 'aln', position: 5,
      ref: '-', alt: 'GG', type: 'insertion', confidence: 'medium',
      readIndex: 4, review: 'unreviewed',
    }
    const csv = toVariantsCsv([ins])
    expect(csv).toContain('5,-,GG,insertion,medium,unreviewed')
  })
})

// ── toVariantsVcf — exact byte output ─────────────────────────────────────────

describe('toVariantsVcf', () => {
  const makeVariant = (overrides: Partial<CalledVariant> = {}): CalledVariant => ({
    id: 'test-aln:3:G:T', alignmentId: 'test-aln', position: 3,
    ref: 'G', alt: 'T', type: 'snv', confidence: 'high',
    readIndex: 2, review: 'unreviewed',
    ...overrides,
  })

  it('EXACT: VCF header line is exactly #CHROM...INFO', () => {
    const vcf = toVariantsVcf([], 'myref')
    expect(vcf).toBe('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n')
  })

  it('EXACT: single high-confidence SNV row has PASS filter', () => {
    const variants = [makeVariant()]
    const vcf = toVariantsVcf(variants, 'myref')
    const lines = vcf.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    const dataLine = lines[1]
    const cols = dataLine.split('\t')
    expect(cols[0]).toBe('myref')       // CHROM
    expect(cols[1]).toBe('3')           // POS
    expect(cols[3]).toBe('G')           // REF
    expect(cols[4]).toBe('T')           // ALT
    expect(cols[6]).toBe('PASS')        // FILTER (high confidence)
    expect(cols[7]).toContain('TYPE=SNV')
  })

  it('medium confidence has . filter (not PASS)', () => {
    const variant = makeVariant({ confidence: 'medium' })
    const vcf = toVariantsVcf([variant], 'ref')
    expect(vcf).toContain('\t.\t')   // FILTER column = .
    expect(vcf).not.toContain('PASS')
  })

  it('excludes suppressed variants', () => {
    const variants = [
      makeVariant({ id: 'v1' }),
      makeVariant({ id: 'v2', review: 'suppressed' }),
    ]
    const vcf = toVariantsVcf(variants, 'ref')
    const lines = vcf.split('\n').filter((l) => !l.startsWith('#') && l.trim())
    expect(lines).toHaveLength(1)
  })
})
