import { describe, expect, it } from 'vitest'
import { getBaseInspectorInfo, getPeakAmplitude } from '../../src/components/BaseInspector'
import type { TraceData } from '../../src/types/trace'

const makeTrace = (): TraceData => {
  const A = new Float32Array(64)
  const C = new Float32Array(64)
  const G = new Float32Array(64)
  const T = new Float32Array(64)
  A[10] = 12
  C[10] = 88
  G[10] = 47
  T[10] = 21
  A[20] = 133
  C[20] = 34
  G[20] = 41
  T[20] = 7
  return {
    format: 'ab1',
    fileName: 'fixture.ab1',
    sampleCount: 64,
    channels: { A, C, G, T },
    baseCalls: ['C', 'N'],
    peakPositions: [10, 20],
    qualities: [33, 7],
    sequence: 'CN',
    metadata: {},
  }
}

describe('BaseInspector', () => {
  it('returns exact inspector values for a canonical base', () => {
    const trace = makeTrace()
    expect(getPeakAmplitude(trace, 0)).toBe(88)
    expect(getBaseInspectorInfo(trace, 0)).toEqual({
      index: 0,
      position: 1,
      base: 'C',
      quality: 33,
      peakAmplitude: 88,
      peakSample: 10,
      ariaLabel: 'Base inspector: position 1, base C, PHRED 33, peak amplitude 88',
    })
  })

  it('uses max channel amplitude for ambiguous calls', () => {
    const trace = makeTrace()
    expect(getPeakAmplitude(trace, 1)).toBe(133)
    const info = getBaseInspectorInfo(trace, 1)
    expect(info?.peakAmplitude).toBe(133)
    expect(info?.ariaLabel).toContain('position 2, base N, PHRED 7, peak amplitude 133')
  })
})
