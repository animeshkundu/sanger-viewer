import { describe, expect, it } from 'vitest'
import { normalizeRange, splitCircularRange, toCircularAngles, toLinearRatios } from '../../src/plasmidMap/layout'

describe('plasmid map layout helpers', () => {
  it('computes exact linear ratios for feature placement', () => {
    const ratios = toLinearRatios({ start: 5, end: 10 }, 20)
    expect(ratios).toEqual({ start: 0.25, end: 0.5, mid: 0.375 })
  })

  it('computes exact circular feature angles for non-wrapping spans', () => {
    const angles = toCircularAngles({ start: 2, end: 8 }, 12)
    expect(angles).toMatchObject({
      startAngle: -30,
      endAngle: 150,
      sweepAngle: 180,
      midAngle: 60,
      wrapsOrigin: false,
    })
  })

  it('handles circular-origin wrapping ranges with exact split segments and angles', () => {
    const normalized = normalizeRange({ start: 10, end: 2 }, 12, 'circular')
    expect(normalized).toEqual({
      start: 10,
      end: 2,
      wrapsOrigin: true,
      span: 4,
    })

    const split = splitCircularRange({ start: 10, end: 2 }, 12)
    expect(split).toEqual([
      { start: 10, end: 12 },
      { start: 0, end: 2 },
    ])

    const angles = toCircularAngles({ start: 10, end: 2 }, 12)
    expect(angles).toMatchObject({
      startAngle: 210,
      endAngle: 330,
      sweepAngle: 120,
      midAngle: 270,
      wrapsOrigin: true,
    })
  })
})
