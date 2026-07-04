/**
 * consensus.test.ts — Exact-value unit tests for computeConsensus and toConsensusFasta.
 */

import { describe, expect, it } from 'vitest'
import { computeConsensus, toConsensusFasta } from '../../src/consensus/consensus'

// ── computeConsensus ────────────────────────────────────────────────────────

describe('computeConsensus', () => {
  // ── Edge cases ────────────────────────────────────────────────────────────

  it('returns empty result for empty input', () => {
    expect(computeConsensus([])).toEqual({
      sequence: '',
      length: 0,
      mismatches: [],
      mismatchCount: 0,
    })
  })

  it('returns the sequence verbatim for a single trace (no mismatches)', () => {
    const result = computeConsensus(['ACGT'])
    expect(result.sequence).toBe('ACGT')
    expect(result.length).toBe(4)
    expect(result.mismatches).toEqual([])
    expect(result.mismatchCount).toBe(0)
  })

  it('clamps length to the shortest sequence', () => {
    const result = computeConsensus(['ACGTACGT', 'ACG'])
    expect(result.length).toBe(3)
    expect(result.sequence).toBe('ACG')
  })

  // ── Unanimous consensus (no mismatches) ──────────────────────────────────

  it('produces exact consensus for two identical sequences', () => {
    const result = computeConsensus(['ACGT', 'ACGT'])
    expect(result).toEqual({
      sequence: 'ACGT',
      length: 4,
      mismatches: [],
      mismatchCount: 0,
    })
  })

  it('handles three identical sequences', () => {
    const result = computeConsensus(['AAAA', 'AAAA', 'AAAA'])
    expect(result.sequence).toBe('AAAA')
    expect(result.mismatchCount).toBe(0)
  })

  // ── Deliberate mismatches ─────────────────────────────────────────────────

  it('detects exact mismatch position for a 2-trace input with one mismatch', () => {
    // trace A: ACGT — pos 2 = 'C'
    // trace B: ATGT — pos 2 = 'T'
    // consensus: A, then CT→Y (IUPAC), G, T
    const result = computeConsensus(['ACGT', 'ATGT'])
    expect(result.sequence).toBe('AYGT')
    expect(result.length).toBe(4)
    expect(result.mismatches).toEqual([1])   // 0-based position 1
    expect(result.mismatchCount).toBe(1)
  })

  it('EXACT: 2 traces, 2 mismatches — validates sequence, mismatch positions, and count', () => {
    // pos 0: A/A → A (agree)
    // pos 1: C/T → CT → Y (mismatch, IUPAC)
    // pos 2: G/G → G (agree)
    // pos 3: T/A → AT → W (mismatch, IUPAC)
    const result = computeConsensus(['ACGT', 'ATGA'])
    expect(result.sequence).toBe('AYGW')
    expect(result.length).toBe(4)
    expect(result.mismatches).toEqual([1, 3])
    expect(result.mismatchCount).toBe(2)
  })

  it('uses IUPAC code for AC tie (M)', () => {
    const result = computeConsensus(['A', 'C'])
    expect(result.sequence).toBe('M')
    expect(result.mismatches).toEqual([0])
  })

  it('uses IUPAC code for AG tie (R)', () => {
    const result = computeConsensus(['A', 'G'])
    expect(result.sequence).toBe('R')
  })

  it('uses IUPAC code for AT tie (W)', () => {
    const result = computeConsensus(['A', 'T'])
    expect(result.sequence).toBe('W')
  })

  it('uses IUPAC code for CG tie (S)', () => {
    const result = computeConsensus(['C', 'G'])
    expect(result.sequence).toBe('S')
  })

  it('uses IUPAC code for CT tie (Y)', () => {
    const result = computeConsensus(['C', 'T'])
    expect(result.sequence).toBe('Y')
  })

  it('uses IUPAC code for GT tie (K)', () => {
    const result = computeConsensus(['G', 'T'])
    expect(result.sequence).toBe('K')
  })

  it('uses IUPAC code for ACG three-way tie (V)', () => {
    const result = computeConsensus(['A', 'C', 'G'])
    expect(result.sequence).toBe('V')
  })

  it('uses IUPAC code for ACT three-way tie (H)', () => {
    const result = computeConsensus(['A', 'C', 'T'])
    expect(result.sequence).toBe('H')
  })

  it('uses IUPAC code for AGT three-way tie (D)', () => {
    const result = computeConsensus(['A', 'G', 'T'])
    expect(result.sequence).toBe('D')
  })

  it('uses IUPAC code for CGT three-way tie (B)', () => {
    const result = computeConsensus(['C', 'G', 'T'])
    expect(result.sequence).toBe('B')
  })

  it('uses N for four-way ACGT tie', () => {
    const result = computeConsensus(['A', 'C', 'G', 'T'])
    expect(result.sequence).toBe('N')
  })

  it('uses sole majority winner when one base has more votes (no tie)', () => {
    // 3× A, 1× C → A wins; still a mismatch position
    const result = computeConsensus(['AAAC', 'AAAC', 'AAAA', 'AAAC'])
    expect(result.sequence[3]).toBe('C')  // C=3, A=1 → C wins
    expect(result.mismatches).toContain(3)
  })

  it('falls back to N for a tied non-IUPAC combination', () => {
    // A and N are tied — N is not in ACGT so no IUPAC key; two tied bases → N
    const result = computeConsensus(['A', 'N'])
    expect(result.sequence).toBe('N')
    expect(result.mismatches).toEqual([0])
  })

  it('is case-insensitive', () => {
    const result = computeConsensus(['acgt', 'ACGT'])
    expect(result.sequence).toBe('ACGT')
    expect(result.mismatchCount).toBe(0)
  })
})

// ── toConsensusFasta ─────────────────────────────────────────────────────────

describe('toConsensusFasta', () => {
  it('produces exact FASTA bytes for a known consensus result', () => {
    const result = computeConsensus(['ACGT', 'ATGA'])
    // sequence = 'AYGW', length = 4, mismatches = [1,3]
    const fasta = toConsensusFasta(result, ['a.ab1', 'b.scf'])
    expect(fasta).toBe(
      '>consensus [2 traces: a.ab1, b.scf]\nAYGW\n',
    )
  })

  it('wraps sequence at 80 characters', () => {
    const long = 'A'.repeat(100)
    const result = computeConsensus([long, long])
    const fasta = toConsensusFasta(result, ['x.ab1', 'y.ab1'])
    const lines = fasta.split('\n')
    // Line 0: header, lines 1–2: 80-char and 20-char body, line 3: empty (trailing newline)
    expect(lines[0]).toBe('>consensus [2 traces: x.ab1, y.ab1]')
    expect(lines[1]).toHaveLength(80)
    expect(lines[2]).toHaveLength(20)
    expect(lines[3]).toBe('')
    // Trailing newline means last char of the string is \n
    expect(fasta.endsWith('\n')).toBe(true)
  })

  it('includes correct header with trace count and file names', () => {
    const result = computeConsensus(['ACG', 'ACG', 'ACG'])
    const fasta = toConsensusFasta(result, ['one.ab1', 'two.ab1', 'three.ab1'])
    expect(fasta.startsWith('>consensus [3 traces: one.ab1, two.ab1, three.ab1]')).toBe(true)
  })

  it('exact FASTA bytes — single-mismatch 2-trace known input', () => {
    // ACGT / ATGT → AYGT; 1 mismatch at pos 1
    const result = computeConsensus(['ACGT', 'ATGT'])
    const fasta = toConsensusFasta(result, ['traceA.ab1', 'traceB.scf'])
    expect(fasta).toBe('>consensus [2 traces: traceA.ab1, traceB.scf]\nAYGT\n')
  })
})
