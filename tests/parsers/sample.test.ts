import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'

describe('bundled sample trace', () => {
  it('parses to the expected known base calls', async () => {
    const samplePath = path.join(process.cwd(), 'public', 'sample.ab1')
    const sample = await fs.readFile(samplePath)
    const trace = parseTrace(
      sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength),
      'sample.ab1',
    )

    expect(trace.baseCalls.length).toBe(868)
    expect(trace.baseCalls[0]).toBe('T')
    expect(trace.baseCalls[49]).toBe('A')
    expect(trace.baseCalls[99]).toBe('C')
    expect(trace.baseCalls.slice(0, 10).join('')).toBe('TGATNTTNAC')
  })
})
