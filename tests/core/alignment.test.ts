/**
 * alignment.test.ts — Exact-value unit tests for the alignment engine,
 * CIGAR builder/parser, and coordinate mappers.
 *
 * Ground spec: docs/specs/07-reference-alignment.md
 */

import { describe, expect, it } from 'vitest'
import { iupacScore, iupacMatch, iupacBases, reverseComplement } from '../../src/alignment/iupac'
import {
  parseCigar,
  buildCigar,
  readPosToRefPos,
  refPosToReadPos,
  cigarRefLength,
  cigarReadLength,
} from '../../src/alignment/cigar'
import { alignReadToReference, parseFastaSequence } from '../../src/alignment/aligner'

// ── IUPAC utilities ──────────────────────────────────────────────────────────

describe('iupacBases', () => {
  it('returns single base for unambiguous codes', () => {
    expect(iupacBases('A')).toEqual(['A'])
    expect(iupacBases('C')).toEqual(['C'])
    expect(iupacBases('G')).toEqual(['G'])
    expect(iupacBases('T')).toEqual(['T'])
  })

  it('expands R to A and G', () => {
    expect(iupacBases('R')).toEqual(['A', 'G'])
  })

  it('expands Y to C and T', () => {
    expect(iupacBases('Y')).toEqual(['C', 'T'])
  })

  it('expands N to all four bases', () => {
    expect(iupacBases('N')).toEqual(['A', 'C', 'G', 'T'])
  })

  it('is case-insensitive', () => {
    expect(iupacBases('r')).toEqual(['A', 'G'])
    expect(iupacBases('n')).toEqual(['A', 'C', 'G', 'T'])
  })

  it('returns empty array for unknown code', () => {
    expect(iupacBases('X')).toEqual([])
  })
})

describe('iupacMatch', () => {
  it('matches identical unambiguous bases', () => {
    expect(iupacMatch('A', 'A')).toBe(true)
    expect(iupacMatch('C', 'C')).toBe(true)
  })

  it('does not match different unambiguous bases', () => {
    expect(iupacMatch('A', 'C')).toBe(false)
    expect(iupacMatch('G', 'T')).toBe(false)
  })

  it('matches when ambiguity code overlaps the unambiguous base', () => {
    expect(iupacMatch('R', 'A')).toBe(true)   // R = A|G, A is in there
    expect(iupacMatch('R', 'G')).toBe(true)
    expect(iupacMatch('Y', 'C')).toBe(true)
    expect(iupacMatch('Y', 'T')).toBe(true)
  })

  it('does not match when ambiguity code does not contain the base', () => {
    expect(iupacMatch('R', 'C')).toBe(false)   // R = A|G, C not in there
    expect(iupacMatch('Y', 'A')).toBe(false)   // Y = C|T
  })

  it('N matches all four bases', () => {
    expect(iupacMatch('N', 'A')).toBe(true)
    expect(iupacMatch('N', 'C')).toBe(true)
    expect(iupacMatch('N', 'G')).toBe(true)
    expect(iupacMatch('N', 'T')).toBe(true)
  })
})

describe('iupacScore', () => {
  it('returns +2 for exact unambiguous match', () => {
    expect(iupacScore('A', 'A')).toBe(2)
    expect(iupacScore('C', 'C')).toBe(2)
  })

  it('returns +1 for IUPAC partial match', () => {
    expect(iupacScore('R', 'A')).toBe(1)
    expect(iupacScore('A', 'R')).toBe(1)
    expect(iupacScore('Y', 'T')).toBe(1)
  })

  it('returns -1 for mismatch', () => {
    expect(iupacScore('A', 'C')).toBe(-1)
    expect(iupacScore('G', 'T')).toBe(-1)
  })

  it('is case-insensitive', () => {
    expect(iupacScore('a', 'A')).toBe(2)
    expect(iupacScore('r', 'A')).toBe(1)
  })
})

describe('reverseComplement', () => {
  it('complements and reverses a simple sequence', () => {
    expect(reverseComplement('ACGT')).toBe('ACGT')
  })

  it('handles all four bases', () => {
    expect(reverseComplement('AAAA')).toBe('TTTT')
    expect(reverseComplement('CCCC')).toBe('GGGG')
    expect(reverseComplement('AACG')).toBe('CGTT')
  })

  it('handles IUPAC codes', () => {
    // R (A|G) → Y (C|T)
    expect(reverseComplement('R')).toBe('Y')
    expect(reverseComplement('ACGR')).toBe('YCGT')
  })

  it('is case-insensitive', () => {
    expect(reverseComplement('acgt')).toBe('ACGT')
  })
})

// ── CIGAR ────────────────────────────────────────────────────────────────────

describe('parseCigar', () => {
  it('parses a simple match CIGAR', () => {
    expect(parseCigar('10M')).toEqual([{ len: 10, op: 'M' }])
  })

  it('parses a complex CIGAR string', () => {
    expect(parseCigar('5M2I3M1D4M')).toEqual([
      { len: 5, op: 'M' },
      { len: 2, op: 'I' },
      { len: 3, op: 'M' },
      { len: 1, op: 'D' },
      { len: 4, op: 'M' },
    ])
  })

  it('returns empty for empty string', () => {
    expect(parseCigar('')).toEqual([])
  })
})

describe('buildCigar', () => {
  it('collapses consecutive identical ops', () => {
    expect(buildCigar(['M', 'M', 'M'])).toBe('3M')
  })

  it('builds a complex CIGAR', () => {
    expect(buildCigar(['M', 'M', 'I', 'M', 'M', 'M'])).toBe('2M1I3M')
  })

  it('returns empty string for empty ops', () => {
    expect(buildCigar([])).toBe('')
  })
})

describe('cigarRefLength / cigarReadLength', () => {
  it('counts M and D for ref length', () => {
    const segs = parseCigar('5M2I3M1D4M')
    expect(cigarRefLength(segs)).toBe(5 + 3 + 1 + 4)   // 13
  })

  it('counts M and I for read length', () => {
    const segs = parseCigar('5M2I3M1D4M')
    expect(cigarReadLength(segs)).toBe(5 + 2 + 3 + 4)   // 14
  })
})

describe('readPosToRefPos', () => {
  it('maps match positions correctly', () => {
    const segs = parseCigar('10M')
    expect(readPosToRefPos(segs, 0)).toBe(0)
    expect(readPosToRefPos(segs, 5)).toBe(5)
    expect(readPosToRefPos(segs, 9)).toBe(9)
  })

  it('returns null for insertion positions', () => {
    const segs = parseCigar('5M2I3M')
    expect(readPosToRefPos(segs, 5)).toBeNull()   // first insertion base
    expect(readPosToRefPos(segs, 6)).toBeNull()   // second insertion base
  })

  it('skips over deletions in ref coords', () => {
    const segs = parseCigar('3M2D3M')
    // Read pos 3 corresponds to ref pos 3+2=5 (skips the 2 deleted ref bases)
    expect(readPosToRefPos(segs, 3)).toBe(5)
  })
})

describe('refPosToReadPos', () => {
  it('maps match positions correctly', () => {
    const segs = parseCigar('10M')
    expect(refPosToReadPos(segs, 0)).toBe(0)
    expect(refPosToReadPos(segs, 9)).toBe(9)
  })

  it('returns null for deletion positions', () => {
    const segs = parseCigar('3M2D3M')
    expect(refPosToReadPos(segs, 3)).toBeNull()   // first deleted ref base
    expect(refPosToReadPos(segs, 4)).toBeNull()   // second deleted ref base
  })

  it('skips over insertions in read coords', () => {
    const segs = parseCigar('3M2I3M')
    // Ref pos 3 is in the second M block → read pos 3+2=5
    expect(refPosToReadPos(segs, 3)).toBe(5)
  })
})

// ── parseFastaSequence ───────────────────────────────────────────────────────

describe('parseFastaSequence', () => {
  it('parses a single-record FASTA', () => {
    const fasta = '>ref1 description\nACGTACGT\nACGT\n'
    const { name, sequence } = parseFastaSequence(fasta)
    expect(name).toBe('ref1')
    expect(sequence).toBe('ACGTACGTACGT')
  })

  it('handles plain bases without header', () => {
    const { name, sequence } = parseFastaSequence('ACGT')
    expect(name).toBe('reference')
    expect(sequence).toBe('ACGT')
  })

  it('uppercases the sequence', () => {
    const { sequence } = parseFastaSequence('>ref\nacgt\n')
    expect(sequence).toBe('ACGT')
  })
})

// ── alignReadToReference — exact-value placement tests ─────────────────────

describe('alignReadToReference', () => {
  it('aligns a perfect-match read to a longer reference', () => {
    // Read = ACGT, reference = NNNACGTNNNN (1-based pos 4–7)
    const reference = 'NNNACGTNNNN'
    const read = 'ACGT'
    const result = alignReadToReference(read, reference, 'ref', 'slot1')
    expect(result.strand).toBe('forward')
    expect(result.refStart).toBe(4)
    expect(result.refEnd).toBe(7)
    expect(result.mismatches).toHaveLength(0)
    expect(result.insertions).toHaveLength(0)
    expect(result.deletions).toHaveLength(0)
  })

  it('detects reverse-complement orientation', () => {
    // RC of ACGT is ACGT, but RC of AACG is CGTT
    // read = CGTT; reference contains AACG (RC of CGTT)
    const reference = 'NNNNAACGNNNN'
    const read = 'CGTT'
    const result = alignReadToReference(read, reference, 'ref', 'slot1')
    expect(result.strand).toBe('reverse')
  })

  it('identifies SNV mismatches — exact positions', () => {
    // Reference: ACGTA, read: ACTTA (T at position 3 instead of G)
    const reference = 'ACGTA'
    const read = 'ACTTA'
    const result = alignReadToReference(read, reference, 'ref', 'slot1')
    expect(result.strand).toBe('forward')
    expect(result.mismatches).toContain(2)   // 0-based read position 2
  })

  it('returns a deterministic id (uuid shape or id-* shape)', () => {
    const result = alignReadToReference('ACGT', 'ACGT', 'ref', 'slot1')
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })

  it('returns 1-based refStart and refEnd', () => {
    const result = alignReadToReference('ACGT', 'ACGT', 'ref', 'slot1')
    expect(result.refStart).toBeGreaterThanOrEqual(1)
    expect(result.refEnd).toBeGreaterThanOrEqual(result.refStart)
  })

  it('EXACT: known read ACGT aligned inside NNACGTNN → refStart=3, refEnd=6', () => {
    const result = alignReadToReference('ACGT', 'NNACGTNN', 'ref', 'slot1')
    expect(result.refStart).toBe(3)
    expect(result.refEnd).toBe(6)
    expect(result.score).toBeGreaterThan(0)
    expect(result.mismatches).toHaveLength(0)
  })

  it('EXACT: SNV at known position — read ACTT vs ref ACGT has mismatch at read pos 2', () => {
    const result = alignReadToReference('ACTT', 'ACGT', 'ref', 'slot1')
    expect(result.mismatches).toContain(2)
  })
})
