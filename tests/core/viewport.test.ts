import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'
import { findNearestPeakIndex, findVisiblePeakRange, mapSampleViewportToBaseRange } from '../../src/render/viewport'

const ROOT = process.cwd()

async function loadBuffer(rel: string): Promise<ArrayBuffer> {
  const raw = await fs.readFile(path.resolve(ROOT, rel))
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
}

describe('viewport helpers', () => {
  it('findVisiblePeakRange returns only peaks inside the viewport', () => {
    const peaks = [10, 20, 30, 40, 50]
    expect(findVisiblePeakRange(peaks, { startSample: 0, endSample: 9 })).toEqual({ start: 0, end: 0 })
    expect(findVisiblePeakRange(peaks, { startSample: 15, endSample: 35 })).toEqual({ start: 1, end: 3 })
    expect(findVisiblePeakRange(peaks, { startSample: 35, endSample: 60 })).toEqual({ start: 3, end: 5 })
  })

  it('findNearestPeakIndex uses the closest peak within the visible range', () => {
    const peaks = [10, 20, 30, 40, 50]
    expect(findNearestPeakIndex(peaks, 9)).toBe(0)
    expect(findNearestPeakIndex(peaks, 24)).toBe(1)
    expect(findNearestPeakIndex(peaks, 26)).toBe(2)
    expect(findNearestPeakIndex(peaks, 35, { start: 2, end: 4 })).toBe(2)
    expect(findNearestPeakIndex(peaks, 100, { start: 5, end: 5 })).toBe(-1)
  })

  it('mapSampleViewportToBaseRange still includes one contextual base on each side', () => {
    const peaks = [10, 20, 30, 40, 50]
    expect(mapSampleViewportToBaseRange(peaks, { startSample: 15, endSample: 35 })).toEqual({ start: 0, end: 4 })
    expect(mapSampleViewportToBaseRange(peaks, { startSample: 15, endSample: 35 }, 2)).toEqual({ start: 0, end: 5 })
  })

  it('resolves 100k long-read hover lookups within 80 ms', async () => {
    const buf = await loadBuffer('fixtures/large/synth-longread-5kbp.ab1')
    const trace = parseTrace(buf, 'synth-longread-5kbp')
    const lookups = 100_000

    const t0 = performance.now()
    let checksum = 0
    for (let i = 0; i < lookups; i += 1) {
      const startSample = (i * 137) % Math.max(1, trace.sampleCount - 800)
      const endSample = startSample + 800
      const visibleRange = findVisiblePeakRange(trace.peakPositions, { startSample, endSample })
      const sample = startSample + (i % 800)
      checksum += findNearestPeakIndex(trace.peakPositions, sample, visibleRange)
    }
    const elapsed = performance.now() - t0

    expect(checksum).toBeGreaterThan(0)
    expect(elapsed, `100k hover lookups took ${elapsed.toFixed(1)} ms`).toBeLessThan(80)
  })
})
