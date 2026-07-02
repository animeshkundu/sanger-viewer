import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'

describe('performance smoke', () => {
  it('parses large fixture under budget', async () => {
    const fixture = await fs.readFile(path.resolve(process.cwd(), 'fixtures/large/3730.ab1'))
    const buffer = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
    const t0 = performance.now()
    const trace = parseTrace(buffer, '3730.ab1')
    const elapsed = performance.now() - t0

    expect(elapsed).toBeLessThan(2000)
    expect(trace.sampleCount).toBeGreaterThan(1000)
  })
})
