/**
 * contig.test.ts — Exact-value unit tests for the paired-read contig assembly.
 *
 * Tests cover:
 *   - scoreOverlap: exact match, IUPAC near-match, mismatch, N/gap
 *   - reverseComplement: known sequences
 *   - findBestOverlap: all four orientations, null for non-overlapping reads,
 *     min-overlap boundary, ties broken by score
 *   - buildPairedContig: known F+R pair → EXACT consensus, coverage, mismatch count
 *   - toContigFasta: exact header + sequence bytes
 */

import { describe, expect, it } from 'vitest'
import { scoreOverlap, findBestOverlap, reverseComplement } from '../../src/consensus/overlap'
import { buildPairedContig, toContigFasta } from '../../src/consensus/contig'

// ── reverseComplement ────────────────────────────────────────────────────────

describe('reverseComplement', () => {
  it('reverses and complements a simple sequence', () => {
    expect(reverseComplement('ACGT')).toBe('ACGT')
  })

  it('correctly complements each base', () => {
    expect(reverseComplement('AAAA')).toBe('TTTT')
    expect(reverseComplement('CCCC')).toBe('GGGG')
    expect(reverseComplement('TTTT')).toBe('AAAA')
    expect(reverseComplement('GGGG')).toBe('CCCC')
  })

  it('reverses the order', () => {
    expect(reverseComplement('ACGT')).toBe('ACGT')   // palindrome
    expect(reverseComplement('AACGT')).toBe('ACGTT')
  })

  it('handles IUPAC ambiguity bases', () => {
    expect(reverseComplement('R')).toBe('Y')   // R = AG; RC → CT = Y
    expect(reverseComplement('Y')).toBe('R')
    expect(reverseComplement('N')).toBe('N')
  })

  it('is case-insensitive (output is uppercase)', () => {
    expect(reverseComplement('acgt')).toBe('ACGT')
  })
})

// ── scoreOverlap ─────────────────────────────────────────────────────────────

describe('scoreOverlap', () => {
  it('returns 0 for strings of different length', () => {
    expect(scoreOverlap('ACG', 'AC')).toBe(0)
  })

  it('scores a perfect match at +1 per position', () => {
    expect(scoreOverlap('ACGT', 'ACGT')).toBe(4)
  })

  it('scores a complete mismatch at -1 per position', () => {
    expect(scoreOverlap('AAAA', 'CCCC')).toBe(-4)
  })

  it('scores N positions as 0 (neutral)', () => {
    // A vs A = +1, N vs C = 0, N vs C = 0, A vs A = +1 → 2
    expect(scoreOverlap('ANNA', 'ACCA')).toBe(2)
  })

  it('scores a gap (-) as 0', () => {
    expect(scoreOverlap('A-GT', 'ACGT')).toBe(3)   // A=+1, -=0, G=+1, T=+1
  })

  it('scores IUPAC-compatible near-match at +0.5', () => {
    // R = {A,G}; matches A (+0.5 for compatible but not exact)
    expect(scoreOverlap('R', 'A')).toBe(0.5)
    expect(scoreOverlap('Y', 'C')).toBe(0.5)   // Y = {C,T}
  })

  it('EXACT: 4-base mixed string', () => {
    // A vs A = +1, C vs T = −1, G vs G = +1, R vs A = +0.5
    expect(scoreOverlap('ACGR', 'ATGA')).toBe(1.5)
  })
})

// ── findBestOverlap ──────────────────────────────────────────────────────────

describe('findBestOverlap', () => {
  it('returns null when no overlap meets minOverlap', () => {
    // Two short sequences that can't overlap with minOverlap=20
    const result = findBestOverlap('AAAA', 'TTTT', 20)
    expect(result).toBeNull()
  })

  it('returns null when all overlap positions are mismatches', () => {
    // A block of As overlapping a block of Cs → score ≤ 0
    const seqA = 'A'.repeat(50)
    const seqB = 'C'.repeat(50)
    const result = findBestOverlap(seqA, seqB, 20)
    expect(result).toBeNull()
  })

  it('finds a forward-forward overlap (fwd orientation)', () => {
    // seqA: 30 As + 20 Ts  →  last 20 bases = 20 Ts
    // seqB: 20 Ts + 30 Cs  →  first 20 bases = 20 Ts
    // Overlap = the 20-T region
    const seqA = 'A'.repeat(30) + 'T'.repeat(20)
    const seqB = 'T'.repeat(20) + 'C'.repeat(30)
    const result = findBestOverlap(seqA, seqB, 20)
    expect(result).not.toBeNull()
    expect(result!.overlapLength).toBe(20)
    expect(result!.score).toBe(20)
    expect(result!.fwdIsA).toBe(true)
  })

  it('finds a reverse-complemented downstream overlap (fwd-rc orientation)', () => {
    // Classic F+R Sanger pair:
    //   fwd: 20 As + 20 Ts  (last 20 = TTTTTTTT...)
    //   rev: 20 As + 20 Ts  → RC = 20 As + 20 Ts
    // A true F/R pair: fwd end overlaps with RC of rev start
    // Let fwdEnd = TTTTTTTTTTTTTTTTTTTT (20 Ts)
    // revSeq = AAAAAAAAAAAAAAAAAAAA (20 As)... RC = TTTTTTTTTTTTTTTTTTTT
    const fwdSeq = 'G'.repeat(30) + 'T'.repeat(25)
    const revSeq = 'A'.repeat(25) + 'C'.repeat(30)  // RC of revSeq starts with T×25
    // RC(revSeq) = RC(C×30 + A×25) = T×25 + G×30
    // fwdSeq last 25 = T×25; RC(revSeq) first 25 = T×25 → should overlap
    const result = findBestOverlap(fwdSeq, revSeq, 20)
    expect(result).not.toBeNull()
    // The best orientation should be fwd-rc (seqA upstream, RC(seqB) downstream)
    expect(result!.score).toBeGreaterThan(0)
    expect(result!.overlapLength).toBeGreaterThanOrEqual(20)
  })

  it('finds a reverse (B upstream) overlap', () => {
    // Design: seqA starts with overlap_X; seqB ends with overlap_X.
    // Only the rev (B upstream → A downstream) orientation gives a positive score.
    //
    // overlap_X = 'AATCGGCCTA' (10 bases, RC = 'TAGGCCGATT' — not self-complementary)
    //
    // seqA = 'AATCGGCCTA' + 'TGACCATGCA'   (starts with X, mixed tail)
    // seqB = 'CGTAGCATCG' + 'AATCGGCCTA'   (mixed prefix, ends with X)
    //
    // rev  (seqB[-10:] = X vs seqA[:10] = X)              → score +10  ← winner
    // fwd  (seqA[-10:] = 'TGACCATGCA' vs seqB[:10] = 'CGTAGCATCG') → negative
    // fwd-rc   RC(seqB) = 'TAGGCCGATTCGATGCTACG'; seqA tail vs that  → ≤ +2
    // rev-rc   seqB tail vs RC(seqA) prefix ('TGCATGGTCA...')        → ≤ +2
    const seqA = 'AATCGGCCTA' + 'TGACCATGCA'
    const seqB = 'CGTAGCATCG' + 'AATCGGCCTA'
    const result = findBestOverlap(seqA, seqB, 10)
    expect(result).not.toBeNull()
    expect(result!.score).toBe(10)
    expect(result!.overlapLength).toBe(10)
    expect(result!.fwdIsA).toBe(false)
  })

  it('returns the BEST (highest-score) overlap when multiple lengths qualify', () => {
    // seqA last 30 bases all match seqB first 30 bases → best overlap = 30
    const seqA = 'A'.repeat(20) + 'C'.repeat(30)
    const seqB = 'C'.repeat(30) + 'T'.repeat(20)
    const result = findBestOverlap(seqA, seqB, 20)
    expect(result).not.toBeNull()
    // Best overlap should be 30 (score 30) not 20 (score 20)
    expect(result!.overlapLength).toBe(30)
    expect(result!.score).toBe(30)
  })
})

// ── buildPairedContig ─────────────────────────────────────────────────────────

describe('buildPairedContig', () => {
  /**
   * Synthetic test pair:
   *   seqA (forward): 'AAAAAACCCCC' (11 bases) — last 5 = CCCCC
   *   seqB (reverse): 'CCCCCGGGGG'  (10 bases) — first 5 = CCCCC
   *   Overlap region: 5 Cs at positions [6..10] in contig coords
   *   Contig: AAAAAACCCCCGGGGG (16 bases)
   */
  const seqA = 'AAAAAACCCCC'   // 11 bases
  const seqB = 'CCCCCGGGGG'    // 10 bases

  it('returns null when no overlap is found', () => {
    const result = buildPairedContig('a', 'a.ab1', 'AAAA', null, 'b', 'b.ab1', 'TTTT', null, 20)
    expect(result).toBeNull()
  })

  it('EXACT: produces correct contig length for a known 5-base overlap', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    // contigLength = 11 + 10 - 5 = 16
    expect(contig!.contigLength).toBe(16)
  })

  it('EXACT: produces the correct consensus string', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    // seqA = AAAAAACCCCC, seqB = CCCCCGGGGG
    // upstream = seqA (fwdIsA), downstream = seqB
    // positions 0-10: seqA; positions 6-15: seqB
    // Overlap at pos 6-10: both read C → unanimous
    // Full contig: A A A A A A C C C C C G G G G G
    //                          ^overlap^
    expect(contig!.consensus).toBe('AAAAAACCCCCGGGGG')
  })

  it('EXACT: overlapStart and overlapEnd match the 5-base overlap region', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    // upstream = seqA (len 11); downstream starts at 11-5=6
    expect(contig!.overlapStart).toBe(6)
    expect(contig!.overlapEnd).toBe(10)
    expect(contig!.overlapLength).toBe(5)
  })

  it('EXACT: coverage is 1 outside overlap and 2 inside overlap', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    const support = contig!.support
    // Positions 0-5: only fwd read → coverage 1
    for (let i = 0; i < 6; i++) {
      expect(support[i].coverage).toBe(1)
    }
    // Positions 6-10: overlap → coverage 2
    for (let i = 6; i <= 10; i++) {
      expect(support[i].coverage).toBe(2)
    }
    // Positions 11-15: only rev read → coverage 1
    for (let i = 11; i <= 15; i++) {
      expect(support[i].coverage).toBe(1)
    }
  })

  it('EXACT: mismatchCount is 0 for identical overlap bases', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    expect(contig!.mismatchCount).toBe(0)
  })

  it('EXACT: singleCoverageCount equals bases outside the overlap', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    // 6 bases from fwd-only + 5 bases from rev-only = 11 single-coverage
    expect(contig!.singleCoverageCount).toBe(11)
  })

  it('EXACT: mismatch in overlap emits IUPAC ambiguity base and increments mismatchCount', () => {
    // seqFwd = 'CATGCTGACCTCGT' (14 bases, ends with 'TCGT')
    // seqRev = 'GCGTGGACATCGCT' (14 bases, starts with 'GCGT')
    //
    // Overlap fwd orientation at k=4: 'TCGT' vs 'GCGT'
    //   T vs G → mismatch → IUPAC K (G+T); C,G,T match
    //   score = -1+1+1+1 = +2  ← winner (verified: all other orientations ≤ 0)
    //
    // downstreamOffset = 14 - 4 = 10
    // contigLength     = 14 + 14 - 4 = 24
    // overlapStart = 10, overlapEnd = 13
    // consensus = 'CATGCTGACC' + 'K' + 'CGT' + 'GGACATCGCT'
    //           = 'CATGCTGACCKCGTGGACATCGCT'
    const seqFwd = 'CATGCTGACCTCGT'
    const seqRev = 'GCGTGGACATCGCT'
    const contig = buildPairedContig('a', 'f.ab1', seqFwd, null, 'b', 'r.ab1', seqRev, null, 4)
    expect(contig).not.toBeNull()
    expect(contig!.mismatchCount).toBe(1)
    expect(contig!.contigLength).toBe(24)
    const overlapStart = contig!.overlapStart
    expect(overlapStart).toBe(10)
    const cons = contig!.consensus
    // Position 10: T (fwd) vs G (rev) → IUPAC K (G+T)
    expect(cons[overlapStart]).toBe('K')
    expect(cons[overlapStart + 1]).toBe('C')
    expect(cons[overlapStart + 2]).toBe('G')
    expect(cons[overlapStart + 3]).toBe('T')
    expect(contig!.consensus).toBe('CATGCTGACCKCGTGGACATCGCT')
  })

  it('quality-weighted consensus prefers higher-quality base in mismatch', () => {
    // Overlap of 1 base: fwd=A (Q=40), rev=C (Q=20) → prefer A
    const seqFwd = 'GGGGA'   // last 1 = A
    const seqRev = 'CTTTTT'  // first 1 = C
    const qualFwd = [30, 30, 30, 30, 40]
    const qualRev = [20, 30, 30, 30, 30, 30]
    const contig = buildPairedContig('a', 'f.ab1', seqFwd, qualFwd, 'b', 'r.ab1', seqRev, qualRev, 1)
    expect(contig).not.toBeNull()
    const overlapStart = contig!.overlapStart
    // fwd quality at overlap pos = 40, rev quality = 20 → choose fwd base A
    expect(contig!.consensus[overlapStart]).toBe('A')
  })

  it('assigns correct fwdName and revName', () => {
    const contig = buildPairedContig('a', 'forward.ab1', seqA, null, 'b', 'reverse.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    expect(contig!.fwdName).toBe('forward.ab1')
    expect(contig!.revName).toBe('reverse.ab1')
  })

  it('stores readIds as [fwdId, revId]', () => {
    const contig = buildPairedContig('slot-1', 'f.ab1', seqA, null, 'slot-2', 'r.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    expect(contig!.readIds[0]).toBe('slot-1')
    expect(contig!.readIds[1]).toBe('slot-2')
  })

  it('support array length equals contigLength', () => {
    const contig = buildPairedContig('a', 'f.ab1', seqA, null, 'b', 'r.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    expect(contig!.support.length).toBe(contig!.contigLength)
  })

  it('support consensusIndex values are 0-based sequential', () => {
    const contig = buildPairedContig('a', 'f.ab1', seqA, null, 'b', 'r.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    contig!.support.forEach((sp, i) => {
      expect(sp.consensusIndex).toBe(i)
    })
  })
})

// ── toContigFasta ─────────────────────────────────────────────────────────────

describe('toContigFasta', () => {
  const seqA = 'AAAAAACCCCC'
  const seqB = 'CCCCCGGGGG'

  it('produces exact FASTA header and sequence bytes', () => {
    const contig = buildPairedContig('a', 'fwd.ab1', seqA, null, 'b', 'rev.ab1', seqB, null, 5)
    expect(contig).not.toBeNull()
    const fasta = toContigFasta(contig!)
    // Header format: >contig [fwdName + revName] {length} bp
    expect(fasta).toMatch(/^>contig \[fwd\.ab1 \+ rev\.ab1\] 16 bp\n/)
    // Sequence line
    expect(fasta).toContain('AAAAAACCCCCGGGGG')
    // Trailing newline
    expect(fasta.endsWith('\n')).toBe(true)
  })

  it('wraps sequence at 80 characters', () => {
    // Build a contig with > 80 bp consensus
    const longA = 'A'.repeat(50) + 'C'.repeat(25)
    const longB = 'C'.repeat(25) + 'G'.repeat(50)
    const contig = buildPairedContig('a', 'f.ab1', longA, null, 'b', 'r.ab1', longB, null, 20)
    expect(contig).not.toBeNull()
    const fasta = toContigFasta(contig!)
    const lines = fasta.split('\n').filter((l) => l.length > 0 && !l.startsWith('>'))
    // All sequence lines should be ≤ 80 characters
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80)
    }
    expect(fasta.endsWith('\n')).toBe(true)
  })
})
