import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'

const root = process.cwd()
const fixtureDirs = ['fixtures/ab1', 'fixtures/scf', 'fixtures/large']

async function listFixtures(): Promise<string[]> {
  const paths = await Promise.all(
    fixtureDirs.map(async (dir) => {
      const full = path.join(root, dir)
      const files = await fs.readdir(full)
      return files.map((file) => path.join(full, file))
    })
  )
  return paths.flat().sort()
}

describe('trace parser fixtures', async () => {
  const fixtures = await listFixtures()
  for (const fixture of fixtures) {
    it(path.basename(fixture), async () => {
      const file = await fs.readFile(fixture)
      const trace = parseTrace(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), path.basename(fixture))

      expect(Object.keys(trace.channels)).toEqual(['A', 'C', 'G', 'T'])
      expect(trace.sampleCount).toBeGreaterThan(100)
      expect(trace.channels.A.length).toBe(trace.channels.C.length)
      expect(trace.channels.G.length).toBe(trace.channels.T.length)
      expect(trace.baseCalls.length).toBeGreaterThan(50)
      expect(trace.sequence).toMatch(/^[ACGTNRYKMSWBDHV.-]+$/i)
      expect(trace.peakPositions.length).toBe(trace.baseCalls.length)
      if (trace.qualities) {
        expect(trace.qualities.length).toBe(trace.baseCalls.length)
      }
    })
  }
})
