import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'
import { decimateSamples } from '../../src/render/decimation'

describe('performance smoke', () => {
  it('parses large fixture under budget', async () => {
    const fixture = await fs.readFile(path.resolve(process.cwd(), 'fixtures/large/3730.ab1'))
    const buffer = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
    const t0 = performance.now()
    const trace = parseTrace(buffer, '3730.ab1')
    const elapsed = performance.now() - t0

    // Tightened from 2000 ms — synchronous parse of the large fixture must
    // complete well within half a second on any CI runner.
    expect(elapsed).toBeLessThan(500)
    expect(trace.sampleCount).toBeGreaterThan(1000)
  })

  it('decimates large fixture channel to pixelWidth points under 20 ms', async () => {
    const fixture = await fs.readFile(path.resolve(process.cwd(), 'fixtures/large/3730.ab1'))
    const buffer = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
    const trace = parseTrace(buffer, '3730.ab1')

    const pixelWidth = 1200
    const spp = trace.sampleCount / pixelWidth

    const t0 = performance.now()
    const points = decimateSamples(trace.channels.A, 0, trace.sampleCount - 1, pixelWidth, 0, spp)
    const elapsed = performance.now() - t0

    expect(points.length).toBeLessThanOrEqual(pixelWidth)
    expect(elapsed).toBeLessThan(20)
  })
})
