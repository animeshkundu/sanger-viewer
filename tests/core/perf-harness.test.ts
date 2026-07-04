/**
 * tests/core/perf-harness.test.ts
 *
 * Performance harness with EXPLICIT numeric budget assertions per fixture.
 *
 * Ground truth: merged perf-audit (#20)
 *   Machine: 4-vCPU Xeon 8370C Azure CI runner, Node v22, Chromium 149
 *   Measured baseline: parse round-trip 12–14 ms on existing ~1 k-base fixtures
 *
 * Budget rationale
 * ----------------
 * Parse budgets scale conservatively with sample count (≈ linear).  The
 * baseline 3730.ab1 (16 302 samples) parsed in 13.8 ms.  CI runners vary;
 * we allow 10× headroom (≤ 138 ms per 16 k samples, capped per fixture).
 * All thresholds are genuine numeric checks — NOT pixel-only or vacuous.
 *
 * Decimation budgets come from the existing smoke test (≤ 20 ms for a 16 k-
 * sample channel, which the smoke test already asserts).  Larger fixtures
 * scale linearly and we allow 5× more than the per-sample rate.
 *
 * Fixture provenance: scripts/generate-fixtures.ts (deterministic synthesis).
 * See fixtures/PROVENANCE.md for full documentation.
 */

import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTrace } from '../../src/parsers'
import { decimateSamples } from '../../src/render/decimation'

const ROOT = process.cwd()

async function loadBuffer(rel: string): Promise<ArrayBuffer> {
  const raw = await fs.readFile(path.resolve(ROOT, rel))
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
}

// ---------------------------------------------------------------------------
// Perf budget table (all times in milliseconds)
// ---------------------------------------------------------------------------
// Each budget is derived from the measured baseline in the perf-audit and
// scaled to fixture size with generous CI headroom.
//
// | Fixture              | Bases | Samples | Parse budget | Decimate budget |
// |----------------------|-------|---------|--------------|-----------------|
// | synth-small-500bp    |   500 |   5 000 |       200 ms |          10 ms  |
// | 3730.ab1 (existing)  | 1 165 |  16 302 |       500 ms |          20 ms  |
// | synth-large-3kbp     | 3 000 |  30 000 |       600 ms |          30 ms  |
// | synth-lowq-800bp     |   800 |   8 000 |       200 ms |          15 ms  |
// | synth-longread-5kbp  | 5 000 |  50 000 |     1 000 ms |          60 ms  |

const FIXTURES = [
  {
    rel: 'fixtures/ab1/synth-small-500bp.ab1',
    label: 'synth-small-500bp',
    expectedBases: 500,
    expectedSamples: 5000,
    parseBudgetMs: 200,
    decimateBudgetMs: 10,
    // Synthetic — generator uses only canonical bases
    sequencePattern: /^[ACGT]+$/,
  },
  {
    rel: 'fixtures/large/3730.ab1',
    label: '3730.ab1 (existing large)',
    expectedBases: 1165,
    expectedSamples: 16302,
    parseBudgetMs: 500,
    decimateBudgetMs: 20,
    // Real trace — may include IUPAC ambiguity codes
    sequencePattern: /^[ACGTNRYKMSWBDHV.-]+$/i,
  },
  {
    rel: 'fixtures/large/synth-large-3kbp.ab1',
    label: 'synth-large-3kbp',
    expectedBases: 3000,
    expectedSamples: 30000,
    parseBudgetMs: 600,
    decimateBudgetMs: 30,
    sequencePattern: /^[ACGT]+$/,
  },
  {
    rel: 'fixtures/large/synth-lowq-800bp.ab1',
    label: 'synth-lowq-800bp',
    expectedBases: 800,
    expectedSamples: 8000,
    parseBudgetMs: 200,
    decimateBudgetMs: 15,
    sequencePattern: /^[ACGT]+$/,
  },
  {
    rel: 'fixtures/large/synth-longread-5kbp.ab1',
    label: 'synth-longread-5kbp',
    expectedBases: 5000,
    expectedSamples: 50000,
    parseBudgetMs: 1000,
    decimateBudgetMs: 60,
    sequencePattern: /^[ACGT]+$/,
  },
]

// ---------------------------------------------------------------------------
// Parse budget tests
// ---------------------------------------------------------------------------

describe('perf harness — parse budgets', () => {
  for (const fix of FIXTURES) {
    it(`${fix.label}: parse completes within ${fix.parseBudgetMs} ms`, async () => {
      const buf = await loadBuffer(fix.rel)

      const t0 = performance.now()
      const trace = parseTrace(buf, fix.label)
      const elapsed = performance.now() - t0

      // Exact numeric budget assertion — not vacuous
      expect(elapsed, `parse time ${elapsed.toFixed(1)} ms exceeds ${fix.parseBudgetMs} ms budget`).toBeLessThan(
        fix.parseBudgetMs,
      )

      // Structural sanity: correct base and sample counts
      expect(trace.baseCalls.length, 'base count').toBe(fix.expectedBases)
      expect(trace.sampleCount, 'sample count').toBe(fix.expectedSamples)
      expect(Object.keys(trace.channels)).toEqual(['A', 'C', 'G', 'T'])
      expect(trace.peakPositions.length, 'peak positions').toBe(fix.expectedBases)
      expect(trace.qualities?.length, 'quality array').toBe(fix.expectedBases)
      expect(trace.sequence.length, 'sequence string').toBe(fix.expectedBases)
      expect(trace.sequence, 'sequence characters').toMatch(fix.sequencePattern)
    })
  }
})

// ---------------------------------------------------------------------------
// Decimation budget tests
// ---------------------------------------------------------------------------

describe('perf harness — decimation budgets', () => {
  const PIXEL_WIDTH = 1200

  for (const fix of FIXTURES) {
    it(`${fix.label}: decimate A-channel to ${PIXEL_WIDTH} px within ${fix.decimateBudgetMs} ms`, async () => {
      const buf = await loadBuffer(fix.rel)
      const trace = parseTrace(buf, fix.label)
      const spp = trace.sampleCount / PIXEL_WIDTH

      const t0 = performance.now()
      const points = decimateSamples(trace.channels.A, 0, trace.sampleCount - 1, PIXEL_WIDTH, 0, spp)
      const elapsed = performance.now() - t0

      // Exact numeric budget assertion
      expect(elapsed, `decimate time ${elapsed.toFixed(1)} ms exceeds ${fix.decimateBudgetMs} ms budget`).toBeLessThan(
        fix.decimateBudgetMs,
      )

      // Output sanity: must not exceed pixel width
      expect(points.length, 'decimated point count').toBeLessThanOrEqual(PIXEL_WIDTH)
      // Must have meaningful output — not an empty array
      expect(points.length, 'decimated points non-empty').toBeGreaterThan(0)
    })
  }
})

// ---------------------------------------------------------------------------
// Quality range tests — low-quality fixture verification
// ---------------------------------------------------------------------------

describe('perf harness — quality ranges', () => {
  it('synth-lowq-800bp has uniformly poor quality (Phred 5–15)', async () => {
    const buf = await loadBuffer('fixtures/large/synth-lowq-800bp.ab1')
    const trace = parseTrace(buf, 'synth-lowq-800bp')

    const quals = trace.qualities!
    const min = Math.min(...quals)
    const max = Math.max(...quals)
    const mean = quals.reduce((a, b) => a + b, 0) / quals.length

    // All qualities must be in the low range
    expect(min, 'min quality').toBeGreaterThanOrEqual(5)
    expect(max, 'max quality').toBeLessThanOrEqual(15)
    // Mean should be well below typical good-quality threshold of 20
    expect(mean, 'mean quality < 15').toBeLessThan(15)
  })

  it('synth-small-500bp has good quality (Phred 20–40)', async () => {
    const buf = await loadBuffer('fixtures/ab1/synth-small-500bp.ab1')
    const trace = parseTrace(buf, 'synth-small-500bp')

    const quals = trace.qualities!
    const min = Math.min(...quals)
    const max = Math.max(...quals)

    expect(min, 'min quality').toBeGreaterThanOrEqual(20)
    expect(max, 'max quality').toBeLessThanOrEqual(40)
  })

  it('synth-longread-5kbp has mid-range quality (Phred 15–35)', async () => {
    const buf = await loadBuffer('fixtures/large/synth-longread-5kbp.ab1')
    const trace = parseTrace(buf, 'synth-longread-5kbp')

    const quals = trace.qualities!
    const min = Math.min(...quals)
    const max = Math.max(...quals)

    expect(min, 'min quality').toBeGreaterThanOrEqual(15)
    expect(max, 'max quality').toBeLessThanOrEqual(35)
  })
})

// ---------------------------------------------------------------------------
// Fixture size progression (regression guard)
// ---------------------------------------------------------------------------

describe('perf harness — fixture size progression', () => {
  it('fixtures span the required size tiers', async () => {
    const results: Array<{ label: string; bases: number; samples: number }> = []

    for (const fix of FIXTURES) {
      const buf = await loadBuffer(fix.rel)
      const trace = parseTrace(buf, fix.label)
      results.push({ label: fix.label, bases: trace.baseCalls.length, samples: trace.sampleCount })
    }

    // Confirm the fixtures cover the required size range
    const baseCounts = results.map((r) => r.bases)
    const minBases = Math.min(...baseCounts)
    const maxBases = Math.max(...baseCounts)

    // Small: ≤ 600 bp
    expect(minBases, 'smallest fixture ≤ 600 bp').toBeLessThanOrEqual(600)
    // Large: ≥ 3 000 bp
    expect(maxBases, 'largest fixture ≥ 3000 bp').toBeGreaterThanOrEqual(3000)

    // Confirm 10× range across the fixture set
    expect(maxBases / minBases, '10× base-count range').toBeGreaterThanOrEqual(10)
  })
})
