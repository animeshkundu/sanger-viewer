import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TraceData } from '../../src/types/trace'
import { callMixedBases } from '../../src/calling/mixedBase'
import { parseTrace } from '../../src/parsers'

function makeSyntheticTrace(): TraceData {
  const sampleCount = 10
  const A = new Float32Array(sampleCount)
  const C = new Float32Array(sampleCount)
  const G = new Float32Array(sampleCount)
  const T = new Float32Array(sampleCount)

  // i=0 A/G => R (60/100)
  A[1] = 100; G[1] = 60
  // i=1 C/T => Y (45/90)
  C[2] = 90; T[2] = 45
  // i=2 G/C => S (72/120)
  G[3] = 120; C[3] = 72
  // i=3 T/A => W (55/110)
  T[4] = 110; A[4] = 55
  // i=4 A/C => M (40/80)
  A[5] = 80; C[5] = 40
  // i=5 T/G => K (49/100)
  T[6] = 100; G[6] = 49
  // i=6 primary only (ratio 0.3)
  C[7] = 100; A[7] = 30

  return {
    format: 'ab1',
    fileName: 'synthetic.ab1',
    sampleCount,
    channels: { A, C, G, T },
    baseCalls: ['A', 'C', 'G', 'T', 'A', 'T', 'C', 'G'],
    peakPositions: [1, 2, 3, 4, 5, 6, 7, -1],
    qualities: null,
    sequence: 'ACGTATCG',
    metadata: {},
  }
}

describe('callMixedBases', () => {
  it('calls exact 2-base IUPAC ambiguities at known indices on synthetic peaks', () => {
    const trace = makeSyntheticTrace()
    const result = callMixedBases(trace, 0.4)

    expect(result.baseCalls).toEqual(['R', 'Y', 'S', 'W', 'M', 'K', 'C', 'G'])
    expect(result.ambiguousIndices).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.ambiguousCount).toBe(6)
    expect(result.sequence).toBe('RYSWMKCG')
  })

  it('uses threshold monotonically and preserves degenerate/invalid calls', () => {
    const trace = makeSyntheticTrace()
    const strict = callMixedBases(trace, 0.7)
    const permissive = callMixedBases(trace, 0.3)

    expect(strict.ambiguousCount).toBeLessThan(permissive.ambiguousCount)
    expect(strict.baseCalls[7]).toBe('G')
    expect(strict.baseCalls[6]).toBe('C')
  })

  it('produces exact known ambiguity calls on real 3100.ab1 fixture', async () => {
    const fixture = await fs.readFile(path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1'))
    const ab = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
    const trace = parseTrace(ab, '3100.ab1')
    const result = callMixedBases(trace, 0.35)

    expect(result.ambiguousCount).toBe(result.ambiguousIndices.length)
    expect(result.ambiguousIndices.slice(0, 6)).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.baseCalls.slice(0, 6)).toEqual(['S', 'S', 'S', 'K', 'K', 'W'])
  })
})
