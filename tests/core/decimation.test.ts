import { describe, expect, it } from 'vitest'
import { decimateSamples } from '../../src/render/decimation'

function makeData(values: number[]): Float32Array {
  return Float32Array.from(values)
}

describe('decimateSamples', () => {
  it('returns one point per sample when spp <= 1 (zoomed in)', () => {
    const data = makeData([1, 2, 3, 4, 5])
    const result = decimateSamples(data, 0, 4, 100, 0, 0.5)
    expect(result.length).toBe(5)
    // Each point should have min === max (no aggregation)
    for (const { min, max } of result) {
      expect(min).toBe(max)
    }
    // Values should match original data
    expect(result.map((p) => p.max)).toEqual([1, 2, 3, 4, 5])
  })

  it('pixel coordinates are correct when spp <= 1', () => {
    const data = makeData([10, 20, 30])
    // spp = 0.5: sample 0 → pixel 0, sample 1 → pixel 2, sample 2 → pixel 4
    const result = decimateSamples(data, 0, 2, 10, 0, 0.5)
    expect(result[0].pixel).toBeCloseTo(0)
    expect(result[1].pixel).toBeCloseTo(2)
    expect(result[2].pixel).toBeCloseTo(4)
  })

  it('returns at most pixelWidth points when spp > 1 (zoomed out)', () => {
    // 1000 samples visible across 100 pixels → spp = 10
    const data = makeData(Array.from({ length: 1000 }, (_, i) => i))
    const result = decimateSamples(data, 0, 999, 100, 0, 10)
    expect(result.length).toBeLessThanOrEqual(100)
  })

  it('computes correct min and max within each bucket when spp > 1', () => {
    // 4 samples across 2 pixels → spp = 2; bucket 0: [5,1], bucket 1: [3,9]
    const data = makeData([5, 1, 3, 9])
    const result = decimateSamples(data, 0, 3, 2, 0, 2)
    expect(result.length).toBe(2)
    expect(result[0].min).toBe(1)
    expect(result[0].max).toBe(5)
    expect(result[1].min).toBe(3)
    expect(result[1].max).toBe(9)
  })

  it('handles empty range gracefully', () => {
    const data = makeData([1, 2, 3])
    const result = decimateSamples(data, 5, 10, 100, 0, 2)
    expect(result).toEqual([])
  })

  it('clamps fromSample and toSample to data bounds', () => {
    const data = makeData([1, 2, 3])
    const result = decimateSamples(data, -5, 100, 10, 0, 1)
    // Should only include indices 0..2 (data length = 3)
    expect(result.length).toBe(3)
  })

  it('returns a single point for a single-sample range', () => {
    const data = makeData([42])
    const result = decimateSamples(data, 0, 0, 100, 0, 1)
    expect(result.length).toBe(1)
    expect(result[0].min).toBe(42)
    expect(result[0].max).toBe(42)
  })

  it('returns empty array when pixelWidth is 0', () => {
    const data = makeData([1, 2, 3])
    const result = decimateSamples(data, 0, 2, 0, 0, 2)
    expect(result).toEqual([])
  })

  it('returns empty array when pixelWidth is negative', () => {
    const data = makeData([1, 2, 3])
    const result = decimateSamples(data, 0, 2, -10, 0, 2)
    expect(result).toEqual([])
  })

  it('returns empty array when pixelWidth is NaN', () => {
    const data = makeData([1, 2, 3])
    const result = decimateSamples(data, 0, 2, NaN, 0, 2)
    expect(result).toEqual([])
  })

  it('caps path complexity at pixelWidth for a very long trace', () => {
    const n = 100_000
    const data = Float32Array.from({ length: n }, () => Math.random() * 1000)
    const pixelWidth = 800
    const spp = n / pixelWidth
    const t0 = performance.now()
    const result = decimateSamples(data, 0, n - 1, pixelWidth, 0, spp)
    const elapsed = performance.now() - t0
    expect(result.length).toBeLessThanOrEqual(pixelWidth)
    expect(elapsed).toBeLessThan(50) // Should complete well under 50 ms
  })
})
