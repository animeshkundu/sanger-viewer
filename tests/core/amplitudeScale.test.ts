/**
 * Amplitude (vertical) scaling — deterministic regression tests.
 *
 * These are the strict fail-before / pass-after signal for the amplitude-scale
 * feature. They exercise two pure, DOM-free modules through the repo's existing
 * Vitest (node env) harness:
 *
 *   1. SVG export honours an `amplitudeScale` option that multiplies the trace
 *      excursion term (height * 0.7) while leaving the baseline (height * 0.85)
 *      untouched. Doubling the scale must exactly double every point's excursion
 *      from the baseline; omitting the option must be identical to `1`.
 *
 *   2. The permalink codec round-trips `view.amplitudeScale`, clamps it to the
 *      documented [0.25, 8] range, and normalizes legacy payloads that predate
 *      the field back to the 1× default (backward compatibility).
 *
 * On the untouched base these FAIL: exportSvg ignores the option (excursion is
 * unchanged) and normalizeState drops the field (decoded value is undefined).
 */

import { describe, expect, it } from 'vitest'
import { exportSvg, type SvgExportOptions } from '../../src/export/svg'
import { decodePermalinkState, encodePermalinkState } from '../../src/workspace/permalink'
import type { TraceData } from '../../src/types/trace'

/** Build a minimal TraceData with a monotonic ramp so decimation is non-trivial. */
function fakeTrace(overrides: Partial<TraceData> = {}): TraceData {
  const sampleCount = 200
  const ramp = new Float32Array(sampleCount).map((_, i) => i * 2)
  return {
    format: 'ab1',
    fileName: 'test.ab1',
    sampleCount,
    channels: { A: ramp, C: ramp, G: ramp, T: ramp },
    baseCalls: ['A', 'C', 'G', 'T', 'A'],
    peakPositions: [10, 50, 100, 150, 190],
    qualities: [30, 40, 50, 60, 70],
    sequence: 'ACGTA',
    metadata: {},
    ...overrides,
  }
}

/** Extract the `d` attribute of the first <path> element in an SVG string. */
function firstPathD(svg: string): string {
  const match = svg.match(/<path d="([^"]*)"/)
  if (!match) throw new Error('no <path> element found in SVG')
  return match[1]
}

/**
 * Largest vertical excursion of a path away from the baseline.
 * Path commands are `M x,y` / `L x,y`; the smallest y is the tallest peak, so the
 * maximum excursion is `baseline - min(y)`.
 */
function maxExcursion(d: string, baseline: number): number {
  const ys: number[] = []
  const re = /[ML](-?[\d.]+),(-?[\d.]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    ys.push(Number(m[2]))
  }
  if (ys.length === 0) throw new Error('no coordinates parsed from path')
  return baseline - Math.min(...ys)
}

describe('exportSvg — amplitudeScale option', () => {
  const width = 1200
  const height = 400
  const baseline = height * 0.85 // 340 — must NOT move with amplitude
  const range: SvgExportOptions = { width, height, startSample: 0, endSample: 199 }

  it('doubles the excursion from the baseline when amplitudeScale = 2', () => {
    const d1 = exportSvg(fakeTrace(), { ...range })
    const d2 = exportSvg(fakeTrace(), { ...range, amplitudeScale: 2 })

    const exc1 = maxExcursion(firstPathD(d1), baseline)
    const exc2 = maxExcursion(firstPathD(d2), baseline)

    // Non-trivial excursion so the doubling assertion is meaningful.
    expect(exc1).toBeGreaterThan(10)
    // The excursion term (height * 0.7) is scaled; doubling the scale doubles it.
    expect(exc2).toBeCloseTo(2 * exc1, 1)
  })

  it('halves the excursion when amplitudeScale = 0.5', () => {
    const d1 = exportSvg(fakeTrace(), { ...range })
    const dHalf = exportSvg(fakeTrace(), { ...range, amplitudeScale: 0.5 })

    const exc1 = maxExcursion(firstPathD(d1), baseline)
    const excHalf = maxExcursion(firstPathD(dHalf), baseline)

    expect(excHalf).toBeCloseTo(exc1 / 2, 1)
  })

  it('treats an omitted amplitudeScale as 1 (identical output)', () => {
    const dDefault = exportSvg(fakeTrace(), { ...range })
    const dOne = exportSvg(fakeTrace(), { ...range, amplitudeScale: 1 })
    expect(dDefault).toBe(dOne)
  })

  it('keeps the baseline fixed while scaling the excursion', () => {
    // Every path point stays at or above the baseline is NOT required (tall peaks
    // may clip off the top at high scale), but the *lowest* excursion — the point
    // nearest the baseline — should also scale, confirming baseline itself (340)
    // is the pivot rather than a shifted origin.
    const d1 = firstPathD(exportSvg(fakeTrace(), { ...range }))
    const d4 = firstPathD(exportSvg(fakeTrace(), { ...range, amplitudeScale: 4 }))
    const exc1 = maxExcursion(d1, baseline)
    const exc4 = maxExcursion(d4, baseline)
    expect(exc4).toBeCloseTo(4 * exc1, 1)
  })
})

describe('permalink codec — view.amplitudeScale', () => {
  const baseState = {
    source: { kind: 'sample', value: 'sample.ab1' } as const,
    view: { startSample: 100, samplesPerPixel: 2, amplitudeScale: 2 },
    strand: 'forward' as const,
    trim: { mode: 'full' as const, threshold: 20 },
    search: { query: '', activeIndex: -1 },
    selection: { baseIndex: null },
    edits: [] as Array<{ forwardIndex: number; base: string; originalBase: string }>,
    overlays: { quality: true, annotations: true, mixedBases: false },
  }

  const amplitudeOf = (view: unknown): number | undefined =>
    (view as { amplitudeScale?: number }).amplitudeScale

  it('round-trips amplitudeScale through encode → decode', () => {
    const encoded = encodePermalinkState(baseState, { maxChars: 1800 })
    if (!encoded.hash) throw new Error(encoded.error ?? 'encode failed')
    const decoded = decodePermalinkState(encoded.hash)
    expect(decoded).not.toBeNull()
    expect(amplitudeOf(decoded!.view)).toBe(2)
  })

  it('clamps amplitudeScale to the [0.25, 8] range', () => {
    const tooHigh = encodePermalinkState(
      { ...baseState, view: { ...baseState.view, amplitudeScale: 100 } },
      { maxChars: 1800 },
    )
    const tooLow = encodePermalinkState(
      { ...baseState, view: { ...baseState.view, amplitudeScale: 0.01 } },
      { maxChars: 1800 },
    )
    if (!tooHigh.hash || !tooLow.hash) throw new Error('encode failed')
    expect(amplitudeOf(decodePermalinkState(tooHigh.hash)!.view)).toBe(8)
    expect(amplitudeOf(decodePermalinkState(tooLow.hash)!.view)).toBe(0.25)
  })

  it('normalizes a legacy payload without amplitudeScale to the 1× default', () => {
    // This hash was minted before amplitudeScale existed (its view is only
    // { startSample, samplesPerPixel }). Decoding it must default amplitude to 1.
    const legacyHash =
      '#sv=eyJ2ZXJzaW9uIjoxLCJzb3VyY2UiOnsia2luZCI6InNhbXBsZSIsInZhbHVlIjoic2FtcGxlLmFiMSJ9LCJ2aWV3Ijp7InN0YXJ0U2FtcGxlIjoxMjMuNSwic2FtcGxlc1BlclBpeGVsIjoyLjI1fSwic3RyYW5kIjoicmV2ZXJzZSIsInRyaW0iOnsibW9kZSI6InRyaW1tZWQiLCJ0aHJlc2hvbGQiOjIzfSwic2VhcmNoIjp7InF1ZXJ5IjoiVEdBVCIsImFjdGl2ZUluZGV4IjoxfSwic2VsZWN0aW9uIjp7ImJhc2VJbmRleCI6NDl9LCJlZGl0cyI6W3siZm9yd2FyZEluZGV4IjoxMCwiYmFzZSI6Ik4iLCJvcmlnaW5hbEJhc2UiOiJBIn1dLCJvdmVybGF5cyI6eyJxdWFsaXR5IjpmYWxzZSwiYW5ub3RhdGlvbnMiOnRydWUsIm1peGVkQmFzZXMiOnRydWV9fQ'
    const decoded = decodePermalinkState(legacyHash)
    expect(decoded).not.toBeNull()
    expect(amplitudeOf(decoded!.view)).toBe(1)
  })
})
