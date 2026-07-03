import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'

const root = process.cwd()

async function readFixture(rel: string): Promise<ArrayBuffer> {
  const full = path.join(root, rel)
  const buf = await fs.readFile(full)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('ABIF metadata (310.ab1)', () => {
  it('extracts sampleName', async () => {
    const buffer = await readFixture('fixtures/ab1/310.ab1')
    const trace = parseTrace(buffer, '310.ab1')
    expect(trace.metadata.sampleName).toBeDefined()
    expect(typeof trace.metadata.sampleName).toBe('string')
    expect((trace.metadata.sampleName as string).length).toBeGreaterThan(0)
  })

  it('extracts instrument', async () => {
    const buffer = await readFixture('fixtures/ab1/310.ab1')
    const trace = parseTrace(buffer, '310.ab1')
    expect(trace.metadata.instrument).toBeDefined()
    expect(typeof trace.metadata.instrument).toBe('string')
  })

  it('has no version field (ABIF format)', async () => {
    const buffer = await readFixture('fixtures/ab1/310.ab1')
    const trace = parseTrace(buffer, '310.ab1')
    expect(trace.metadata.version).toBeUndefined()
  })
})

describe('ABIF metadata (3100.ab1)', () => {
  it('parses without error and returns TraceMetadata', async () => {
    const buffer = await readFixture('fixtures/ab1/3100.ab1')
    const trace = parseTrace(buffer, '3100.ab1')
    expect(trace.format).toBe('ab1')
    // All metadata fields must be either string/number/undefined — no legacy keys
    const meta = trace.metadata
    const allowedKeys = new Set(['sampleName', 'instrument', 'model', 'runDate', 'dyeSet', 'baseCaller', 'comment', 'lane', 'version'])
    for (const key of Object.keys(meta)) {
      expect(allowedKeys.has(key)).toBe(true)
    }
  })
})

describe('SCF metadata (abcZ_F.scf)', () => {
  it('has version field', async () => {
    const buffer = await readFixture('fixtures/scf/abcZ_F.scf')
    const trace = parseTrace(buffer, 'abcZ_F.scf')
    expect(trace.format).toBe('scf')
    expect(trace.metadata.version).toBeDefined()
    expect(typeof trace.metadata.version).toBe('number')
  })

  it('has no ABIF-only fields', async () => {
    const buffer = await readFixture('fixtures/scf/abcZ_F.scf')
    const trace = parseTrace(buffer, 'abcZ_F.scf')
    // SCF files have no ABIF tags; all ABIF-only fields should be absent
    expect(trace.metadata.sampleName).toBeUndefined()
    expect(trace.metadata.instrument).toBeUndefined()
    expect(trace.metadata.model).toBeUndefined()
    expect(trace.metadata.dyeSet).toBeUndefined()
  })
})

describe('metadata graceful absence', () => {
  it('ABIF optional fields are undefined or of expected primitive type', async () => {
    const buffer = await readFixture('fixtures/ab1/310.ab1')
    const trace = parseTrace(buffer, '310.ab1')
    // Each optional field must be undefined OR a finite primitive of the correct type
    const { model, dyeSet, lane } = trace.metadata
    expect(model === undefined || typeof model === 'string').toBe(true)
    expect(dyeSet === undefined || typeof dyeSet === 'string').toBe(true)
    expect(lane === undefined || (typeof lane === 'number' && Number.isFinite(lane))).toBe(true)
  })
})
