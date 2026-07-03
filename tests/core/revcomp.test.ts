import { describe, expect, it } from 'vitest'
import { iupacComplement, reverseComplementTrace } from '../../src/revcomp'
import type { TraceData } from '../../src/types/trace'

// ---------------------------------------------------------------------------
// iupacComplement
// ---------------------------------------------------------------------------

describe('iupacComplement', () => {
  it('complements standard bases', () => {
    expect(iupacComplement('A')).toBe('T')
    expect(iupacComplement('T')).toBe('A')
    expect(iupacComplement('C')).toBe('G')
    expect(iupacComplement('G')).toBe('C')
  })

  it('complements all 15 IUPAC ambiguity codes (uppercase)', () => {
    // Standard
    expect(iupacComplement('A')).toBe('T')
    expect(iupacComplement('T')).toBe('A')
    expect(iupacComplement('C')).toBe('G')
    expect(iupacComplement('G')).toBe('C')
    // Ambiguous
    expect(iupacComplement('R')).toBe('Y') // A|G → C|T
    expect(iupacComplement('Y')).toBe('R') // C|T → A|G
    expect(iupacComplement('S')).toBe('S') // C|G → C|G
    expect(iupacComplement('W')).toBe('W') // A|T → A|T
    expect(iupacComplement('K')).toBe('M') // G|T → A|C
    expect(iupacComplement('M')).toBe('K') // A|C → G|T
    expect(iupacComplement('B')).toBe('V') // C|G|T → A|C|G
    expect(iupacComplement('V')).toBe('B') // A|C|G → C|G|T
    expect(iupacComplement('D')).toBe('H') // A|G|T → A|C|T
    expect(iupacComplement('H')).toBe('D') // A|C|T → A|G|T
    expect(iupacComplement('N')).toBe('N')
  })

  it('is case-preserving (lowercase → lowercase)', () => {
    expect(iupacComplement('a')).toBe('t')
    expect(iupacComplement('t')).toBe('a')
    expect(iupacComplement('c')).toBe('g')
    expect(iupacComplement('g')).toBe('c')
    expect(iupacComplement('n')).toBe('n')
  })

  it('returns unknown characters unchanged', () => {
    expect(iupacComplement('X')).toBe('X')
    expect(iupacComplement('-')).toBe('-')
    expect(iupacComplement('.')).toBe('.')
  })
})

// ---------------------------------------------------------------------------
// reverseComplementTrace
// ---------------------------------------------------------------------------

/** Build a minimal synthetic TraceData for testing. */
function makeTrace(opts: {
  a: number[]
  c: number[]
  g: number[]
  t: number[]
  baseCalls: string[]
  peakPositions: number[]
  qualities?: number[]
}): TraceData {
  const sampleCount = opts.a.length
  return {
    format: 'ab1',
    fileName: 'test.ab1',
    sampleCount,
    channels: {
      A: Float32Array.from(opts.a),
      C: Float32Array.from(opts.c),
      G: Float32Array.from(opts.g),
      T: Float32Array.from(opts.t),
    },
    baseCalls: opts.baseCalls,
    peakPositions: opts.peakPositions,
    qualities: opts.qualities ?? null,
    sequence: opts.baseCalls.join(''),
    metadata: {},
  }
}

describe('reverseComplementTrace', () => {
  const trace = makeTrace({
    a: [1, 2, 3, 4],
    c: [5, 6, 7, 8],
    g: [9, 10, 11, 12],
    t: [13, 14, 15, 16],
    baseCalls: ['A', 'C', 'G', 'T'],
    peakPositions: [0, 1, 2, 3],
    qualities: [10, 20, 30, 40],
  })

  it('mirrors channels correctly (A↔T, C↔G)', () => {
    const rc = reverseComplementTrace(trace)
    // New A channel = reverse of old T channel: [16,15,14,13]
    expect(Array.from(rc.channels.A)).toEqual([16, 15, 14, 13])
    // New T channel = reverse of old A channel: [4,3,2,1]
    expect(Array.from(rc.channels.T)).toEqual([4, 3, 2, 1])
    // New C channel = reverse of old G channel: [12,11,10,9]
    expect(Array.from(rc.channels.C)).toEqual([12, 11, 10, 9])
    // New G channel = reverse of old C channel: [8,7,6,5]
    expect(Array.from(rc.channels.G)).toEqual([8, 7, 6, 5])
  })

  it('mirrors peak positions correctly', () => {
    const rc = reverseComplementTrace(trace)
    // Original positions: [0,1,2,3], sampleCount=4
    // newPos[i] = (sampleCount-1) - oldPos[len-1-i]
    // newPos[0] = 3 - oldPos[3] = 3-3 = 0
    // newPos[1] = 3 - oldPos[2] = 3-2 = 1
    // newPos[2] = 3 - oldPos[1] = 3-1 = 2
    // newPos[3] = 3 - oldPos[0] = 3-0 = 3
    // This input is symmetric so result equals input
    expect(rc.peakPositions).toEqual([0, 1, 2, 3])
  })

  it('mirrors peak positions for an asymmetric case', () => {
    const t = makeTrace({
      a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      c: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      g: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      t: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      baseCalls: ['A', 'C', 'G', 'T'],
      peakPositions: [1, 2, 5, 8], // sampleCount=10
    })
    const rc = reverseComplementTrace(t)
    // newPos[i] = 9 - oldPos[3-i]
    // newPos[0] = 9 - 8 = 1
    // newPos[1] = 9 - 5 = 4
    // newPos[2] = 9 - 2 = 7
    // newPos[3] = 9 - 1 = 8
    expect(rc.peakPositions).toEqual([1, 4, 7, 8])
  })

  it('reverses and complements base calls', () => {
    const rc = reverseComplementTrace(trace)
    // 'ACGT' → reversed: 'TGCA' → complemented: 'ACGT'
    expect(rc.baseCalls).toEqual(['A', 'C', 'G', 'T'])
  })

  it('sequence matches joined base calls', () => {
    const rc = reverseComplementTrace(trace)
    expect(rc.sequence).toBe(rc.baseCalls.join(''))
  })

  it('reverses qualities', () => {
    const rc = reverseComplementTrace(trace)
    expect(rc.qualities).toEqual([40, 30, 20, 10])
  })

  it('preserves metadata and scalar fields', () => {
    const rc = reverseComplementTrace(trace)
    expect(rc.format).toBe('ab1')
    expect(rc.fileName).toBe('test.ab1')
    expect(rc.sampleCount).toBe(4)
  })

  it('handles null qualities', () => {
    const noQual = makeTrace({
      a: [1], c: [2], g: [3], t: [4],
      baseCalls: ['A'], peakPositions: [0],
    })
    const rc = reverseComplementTrace(noQual)
    expect(rc.qualities).toBeNull()
  })

  it('applying revcomp twice returns the original sequence', () => {
    const rc = reverseComplementTrace(trace)
    const rcrc = reverseComplementTrace(rc)
    expect(rcrc.baseCalls).toEqual(trace.baseCalls)
    expect(Array.from(rcrc.channels.A)).toEqual(Array.from(trace.channels.A))
    expect(rcrc.peakPositions).toEqual(trace.peakPositions)
  })

  it('handles IUPAC ambiguity codes in base calls', () => {
    const iupacTrace = makeTrace({
      a: [1, 2, 3, 4, 5],
      c: [1, 2, 3, 4, 5],
      g: [1, 2, 3, 4, 5],
      t: [1, 2, 3, 4, 5],
      baseCalls: ['R', 'Y', 'S', 'K', 'N'],
      peakPositions: [0, 1, 2, 3, 4],
    })
    const rc = reverseComplementTrace(iupacTrace)
    // Reversed: ['N','K','S','Y','R'] → complemented: ['N','M','S','R','Y']
    expect(rc.baseCalls).toEqual(['N', 'M', 'S', 'R', 'Y'])
  })
})
