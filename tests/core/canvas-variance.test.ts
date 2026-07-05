/**
 * tests/core/canvas-variance.test.ts
 *
 * Unit tests for computePixelVariance + MIN_CANVAS_VARIANCE_THRESHOLD.
 *
 * Key property: a canvas uniformly filled with ANY single colour (white, or the
 * dark-theme surface #1e293b) must have variance = 0 and FAIL the non-blank
 * threshold.  Only a canvas with genuinely distinct pixel colours (e.g. a real
 * chromatogram) should pass.
 */

import { describe, it, expect } from 'vitest'
import { computePixelVariance, MIN_CANVAS_VARIANCE_THRESHOLD } from '../e2e/helpers/ux-gallery'

describe('computePixelVariance', () => {
  it('uniform white canvas → variance 0 → fails non-blank threshold', () => {
    const pixelCount = 100
    const data = new Uint8ClampedArray(pixelCount * 4).fill(255)
    const variance = computePixelVariance(data, pixelCount)
    expect(variance).toBe(0)
    expect(variance).toBeLessThanOrEqual(MIN_CANVAS_VARIANCE_THRESHOLD)
  })

  it('uniform dark canvas (#1e293b, dark-theme surface) → variance 0 → fails non-blank threshold', () => {
    const pixelCount = 100
    const data = new Uint8ClampedArray(pixelCount * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 30   // R
      data[i + 1] = 41 // G
      data[i + 2] = 59 // B
      data[i + 3] = 255 // A
    }
    const variance = computePixelVariance(data, pixelCount)
    // All pixels have identical luminance → variance is essentially 0
    // (floating-point arithmetic may give a value like 1.8e-27; check < 1)
    expect(variance).toBeLessThan(1)
    expect(variance).toBeLessThanOrEqual(MIN_CANVAS_VARIANCE_THRESHOLD)
  })

  it('canvas with distinct chromatogram colors → variance well above threshold', () => {
    // Simulate 4 pixels: red (A), green (C), blue (G), black (T) on white
    const data = new Uint8ClampedArray([
      255,   0,   0, 255,   // red — A peak
        0, 200,   0, 255,   // green — C peak
        0,   0, 255, 255,   // blue — G peak
        0,   0,   0, 255,   // black — T peak
    ])
    const pixelCount = 4
    const variance = computePixelVariance(data, pixelCount)
    expect(variance).toBeGreaterThan(MIN_CANVAS_VARIANCE_THRESHOLD)
  })

  it('returns 0 for empty canvas (pixelCount = 0)', () => {
    expect(computePixelVariance(new Uint8ClampedArray(0), 0)).toBe(0)
  })
})
