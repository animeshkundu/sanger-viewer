import { describe, expect, it } from 'vitest'
import { clampViewport } from '../../src/render/viewport'

describe('viewport clamping', () => {
  it('keeps values in range', () => {
    const vp = clampViewport(999999, 0.1, 1000, 400)
    expect(vp.startSample).toBeGreaterThanOrEqual(0)
    expect(vp.endSample).toBeLessThanOrEqual(1000)
    expect(vp.samplesPerPixel).toBeGreaterThanOrEqual(0.5)
  })
})
