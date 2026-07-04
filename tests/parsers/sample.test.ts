import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'

describe('bundled sample trace', () => {
  it('parses the exact expected base calls', async () => {
    const full = path.join(process.cwd(), 'public/sample.ab1')
    const buf = await fs.readFile(full)
    const trace = parseTrace(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'sample.ab1')

    expect(trace.baseCalls).toHaveLength(868)
    expect(trace.baseCalls[0]).toBe('T')
    expect(trace.baseCalls[49]).toBe('A')
    expect(trace.baseCalls[99]).toBe('C')
    expect(trace.baseCalls.slice(0, 10).join('')).toBe('TGATNTTNAC')
  })
})
