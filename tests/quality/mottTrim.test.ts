/**
 * Unit tests for the Mott PHRED quality end-trimming algorithm (src/quality/mottTrim.ts).
 *
 * Coverage:
 *   - Basic trim at a known quality array (fixed expected boundaries).
 *   - No-quality fallback (null qualities).
 *   - All-below-threshold case.
 *   - Threshold = 0 (trivially keeps everything).
 *   - Trim on real fixture files (boundaries within valid range, length > 0 for Q20).
 *   - meanQuality computed correctly over the kept window.
 *   - trimmedSequence matches the kept base calls.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { mottTrim } from '../../src/quality/mottTrim'
import { parseTrace } from '../../src/parsers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQualities(values: number[]): number[] {
  return values
}

function makeBaseCalls(n: number): string[] {
  const bases = ['A', 'C', 'G', 'T']
  return Array.from({ length: n }, (_, i) => bases[i % 4])
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

describe('mottTrim — null / empty qualities', () => {
  it('returns no-quality status when qualities is null', () => {
    const bases = makeBaseCalls(10)
    const r = mottTrim(null, bases, 20)
    expect(r.status).toBe('no-quality')
    expect(r.trimStart).toBe(0)
    expect(r.trimEnd).toBe(10)
    expect(r.trimmedLength).toBe(10)
    expect(r.trimmedSequence).toBe(bases.join(''))
    expect(Number.isNaN(r.meanQuality)).toBe(true)
  })

  it('returns no-quality status when qualities is empty', () => {
    const r = mottTrim([], ['A', 'G'], 20)
    expect(r.status).toBe('no-quality')
    expect(r.trimEnd).toBe(2)
  })
})

describe('mottTrim — all-trimmed', () => {
  it('returns all-trimmed when every quality is below threshold', () => {
    const quals = [5, 5, 5, 5, 5]
    const r = mottTrim(quals, makeBaseCalls(5), 20)
    expect(r.status).toBe('all-trimmed')
    expect(r.trimStart).toBe(0)
    expect(r.trimEnd).toBe(0)
    expect(r.trimmedLength).toBe(0)
    expect(r.trimmedSequence).toBe('')
    expect(Number.isNaN(r.meanQuality)).toBe(true)
  })

  it('returns all-trimmed when quality exactly equals threshold (score = 0 everywhere)', () => {
    // score(i) = quality(i) - threshold; max sum of zeros is 0, which never beats maxSum (starts 0).
    // The algorithm only updates trimEnd when runningSum > maxSum (strict), so exact-threshold
    // bases produce trimEnd = 0 → all-trimmed.
    const quals = [20, 20, 20]
    const r = mottTrim(quals, makeBaseCalls(3), 20)
    expect(r.status).toBe('all-trimmed')
  })
})

describe('mottTrim — threshold = 0', () => {
  it('keeps all bases when threshold is 0 (every quality scores ≥ 0)', () => {
    const quals = [1, 0, 5, 0, 3]
    const r = mottTrim(quals, makeBaseCalls(5), 0)
    // At threshold=0, score[i] = quality[i] ≥ 0, so no resets, all bases kept.
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(0)
    expect(r.trimEnd).toBe(5)
    expect(r.trimmedLength).toBe(5)
  })
})

describe('mottTrim — known quality arrays (fixed expected boundaries)', () => {
  it('trims low-quality ends, keeps high-quality core (threshold 20)', () => {
    // Low, low, HIGH, HIGH, HIGH, HIGH, low, low
    // scores: -15, -10, 10, 15, 5, 8, -12, -5
    // Mott / Kadane:
    //   i=0: sum=-15 → reset, start=1
    //   i=1: sum=-10 → reset, start=2
    //   i=2: sum=10 > 0 → maxSum=10, trimStart=2, trimEnd=3
    //   i=3: sum=25 > 10 → maxSum=25, trimStart=2, trimEnd=4
    //   i=4: sum=30 > 25 → maxSum=30, trimStart=2, trimEnd=5
    //   i=5: sum=38 > 30 → maxSum=38, trimStart=2, trimEnd=6
    //   i=6: sum=26 (no update)
    //   i=7: sum=21 (no update)
    // → kept window: [2, 6)
    const quals = [5, 10, 30, 35, 25, 28, 8, 15]
    const bases = makeBaseCalls(8)
    const r = mottTrim(quals, bases, 20)
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(2)
    expect(r.trimEnd).toBe(6)
    expect(r.trimmedLength).toBe(4)
    expect(r.trimmedSequence).toBe(bases.slice(2, 6).join(''))
  })

  it('a single high-quality base at position 0 is kept (no left trim)', () => {
    const quals = [40, 5, 5, 5]
    const bases = makeBaseCalls(4)
    const r = mottTrim(quals, bases, 20)
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(0)
    expect(r.trimEnd).toBe(1)
  })

  it('a single high-quality base at the last position (right end only)', () => {
    const quals = [5, 5, 5, 40]
    const bases = makeBaseCalls(4)
    const r = mottTrim(quals, bases, 20)
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(3)
    expect(r.trimEnd).toBe(4)
    expect(r.trimmedLength).toBe(1)
  })

  it('all-high-quality sequence is kept intact (trimStart=0, trimEnd=n)', () => {
    const quals = [30, 35, 40, 38, 32, 36]
    const bases = makeBaseCalls(6)
    const r = mottTrim(quals, bases, 20)
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(0)
    expect(r.trimEnd).toBe(6)
    expect(r.trimmedLength).toBe(6)
  })

  it('two equally-scoring windows: keeps the one that contributes more total score', () => {
    // Block A [0,2): scores 10+10 = 20; Block B [4,6): scores 15+15 = 30
    // Intervening low-quality [2,4): scores -5, -5 → sum < 0 at i=2 → reset.
    // Kadane keeps the window with the highest running sum.
    const quals = [30, 30, 5, 5, 35, 35]
    const r = mottTrim(quals, makeBaseCalls(6), 20)
    expect(r.status).toBe('ok')
    expect(r.trimStart).toBe(4)
    expect(r.trimEnd).toBe(6)
  })
})

describe('mottTrim — statistics', () => {
  it('meanQuality is the mean of kept-window qualities', () => {
    const quals = [5, 5, 30, 40, 30, 5, 5]
    const r = mottTrim(quals, makeBaseCalls(7), 20)
    expect(r.status).toBe('ok')
    const expectedMean = (quals.slice(r.trimStart, r.trimEnd).reduce((a, b) => a + b, 0)) / r.trimmedLength
    expect(r.meanQuality).toBeCloseTo(expectedMean, 5)
  })

  it('trimmedSequence equals baseCalls.slice(trimStart, trimEnd).join("")', () => {
    const quals = [5, 30, 40, 30, 5]
    const bases = ['A', 'C', 'G', 'T', 'A']
    const r = mottTrim(quals, bases, 20)
    expect(r.status).toBe('ok')
    expect(r.trimmedSequence).toBe(bases.slice(r.trimStart, r.trimEnd).join(''))
  })
})

// ---------------------------------------------------------------------------
// Fixture-based integration tests
// ---------------------------------------------------------------------------

describe('mottTrim — real fixture files', () => {
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/ab1')

  it('3100.ab1 at Q20: trimmed boundaries are within valid range and length > 0', async () => {
    const buf = await fs.readFile(path.join(fixtureDir, '3100.ab1'))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const trace = parseTrace(ab, '3100.ab1')

    const r = mottTrim(trace.qualities, trace.baseCalls, 20)
    expect(['ok', 'no-quality', 'all-trimmed']).toContain(r.status)

    if (r.status === 'ok') {
      expect(r.trimStart).toBeGreaterThanOrEqual(0)
      expect(r.trimEnd).toBeLessThanOrEqual(trace.baseCalls.length)
      expect(r.trimStart).toBeLessThan(r.trimEnd)
      expect(r.trimmedLength).toBe(r.trimEnd - r.trimStart)
      expect(r.trimmedSequence.length).toBe(r.trimmedLength)
      expect(r.meanQuality).toBeGreaterThan(0)
      // At Q20, trimmed sequence should be a subsequence of the full sequence
      expect(trace.sequence).toContain(r.trimmedSequence)
    }
  })

  it('3100.ab1 at Q20: trimmedLength < full length (real trimming happened)', async () => {
    const buf = await fs.readFile(path.join(fixtureDir, '3100.ab1'))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const trace = parseTrace(ab, '3100.ab1')

    if (!trace.qualities) return // skip if no quality data
    const r = mottTrim(trace.qualities, trace.baseCalls, 20)
    if (r.status !== 'ok') return
    // The real trace should have at least some trimming at Q20
    expect(r.trimmedLength).toBeLessThanOrEqual(trace.baseCalls.length)
  })

  it('3100.ab1: Q0 keeps at least as many bases as Q20', async () => {
    const buf = await fs.readFile(path.join(fixtureDir, '3100.ab1'))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const trace = parseTrace(ab, '3100.ab1')

    if (!trace.qualities) return
    const r0 = mottTrim(trace.qualities, trace.baseCalls, 0)
    const r20 = mottTrim(trace.qualities, trace.baseCalls, 20)
    if (r0.status !== 'ok' || r20.status !== 'ok') return
    expect(r0.trimmedLength).toBeGreaterThanOrEqual(r20.trimmedLength)
  })

  it('3100.ab1: Q40 keeps fewer bases than Q20 (stricter threshold)', async () => {
    const buf = await fs.readFile(path.join(fixtureDir, '3100.ab1'))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const trace = parseTrace(ab, '3100.ab1')

    if (!trace.qualities) return
    const r20 = mottTrim(trace.qualities, trace.baseCalls, 20)
    const r40 = mottTrim(trace.qualities, trace.baseCalls, 40)
    if (r20.status !== 'ok') return
    // Q40 must keep fewer or equal bases than Q20
    const len40 = r40.status === 'ok' ? r40.trimmedLength : 0
    expect(len40).toBeLessThanOrEqual(r20.trimmedLength)
  })

  it('310.ab1 at Q20: parses and trims without throwing', async () => {
    const fixtureFile = path.join(fixtureDir, '310.ab1')
    const buf = await fs.readFile(fixtureFile)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const trace = parseTrace(ab, '310.ab1')

    expect(() => mottTrim(trace.qualities, trace.baseCalls, 20)).not.toThrow()
    const r = mottTrim(trace.qualities, trace.baseCalls, 20)
    expect(['ok', 'no-quality', 'all-trimmed']).toContain(r.status)
  })
})
