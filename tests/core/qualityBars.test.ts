import { describe, expect, it } from 'vitest'
import { computeQualityBars } from '../../src/quality/qualityBars'
import { reverseComplementTrace } from '../../src/revcomp'
import type { TraceData } from '../../src/types/trace'

describe('computeQualityBars', () => {
  it('maps visible peaks to exact x positions, heights, and color tiers', () => {
    const bars = computeQualityBars(
      [0, 20, 30, 40],
      [10, 20, 30, 40],
      0,
      2,
      30,
    )
    expect(bars).toEqual([
      { baseIndex: 0, score: 0, x: 5, height: 1, tier: 'poor', cssVar: '--color-qual-poor' },
      { baseIndex: 1, score: 20, x: 10, height: 20, tier: 'fair', cssVar: '--color-qual-fair' },
      { baseIndex: 2, score: 30, x: 15, height: 30, tier: 'good', cssVar: '--color-qual-good' },
      { baseIndex: 3, score: 40, x: 20, height: 40, tier: 'excellent', cssVar: '--color-qual-excellent' },
    ])
  })

  it('respects trim window and viewport clipping', () => {
    const bars = computeQualityBars(
      [10, 20, 30, 40, 35],
      [5, 10, 15, 20, 25],
      8,
      1,
      10,
      1,
      4,
    )
    expect(bars).toEqual([
      { baseIndex: 1, score: 20, x: 2, height: 20, tier: 'fair', cssVar: '--color-qual-fair' },
      { baseIndex: 2, score: 30, x: 7, height: 30, tier: 'good', cssVar: '--color-qual-good' },
    ])
  })

  it('keeps reverse-complement coordinates and quality order aligned', () => {
    const trace: TraceData = {
      format: 'ab1',
      fileName: 'trace.ab1',
      sampleCount: 100,
      channels: {
        A: new Float32Array(100),
        C: new Float32Array(100),
        G: new Float32Array(100),
        T: new Float32Array(100),
      },
      baseCalls: ['A', 'C', 'G'],
      peakPositions: [10, 30, 50],
      qualities: [10, 20, 40],
      sequence: 'ACG',
      metadata: {},
    }
    const rev = reverseComplementTrace(trace)
    const bars = computeQualityBars(rev.qualities, rev.peakPositions, 0, 1, 120)
    expect(bars.map((bar) => ({ baseIndex: bar.baseIndex, x: bar.x, score: bar.score }))).toEqual([
      { baseIndex: 0, x: 49, score: 40 },
      { baseIndex: 1, x: 69, score: 20 },
      { baseIndex: 2, x: 89, score: 10 },
    ])
  })
})
