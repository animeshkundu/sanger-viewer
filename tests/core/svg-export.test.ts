import { describe, expect, it } from 'vitest'
import { exportSvg } from '../../src/export/svg'
import type { TraceData } from '../../src/types/trace'

/** Build a minimal TraceData for export tests. */
function fakeTrace(overrides: Partial<TraceData> = {}): TraceData {
  const sampleCount = 200
  // Ramp signal so decimation produces non-trivial output.
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

describe('exportSvg', () => {
  it('returns a string beginning with <svg', () => {
    const svg = exportSvg(fakeTrace())
    expect(typeof svg).toBe('string')
    expect(svg.startsWith('<svg ')).toBe(true)
  })

  it('includes the XML namespace', () => {
    const svg = exportSvg(fakeTrace())
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('closes with </svg>', () => {
    const svg = exportSvg(fakeTrace())
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('uses the requested width and height', () => {
    const svg = exportSvg(fakeTrace(), { width: 800, height: 300 })
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="300"')
    expect(svg).toContain('viewBox="0 0 800 300"')
  })

  it('defaults to 1200×400', () => {
    const svg = exportSvg(fakeTrace())
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="400"')
  })

  it('contains a path element for each trace channel (A C G T)', () => {
    const svg = exportSvg(fakeTrace())
    // Check that all four TRACE_COLORS appear as stroke values.
    expect(svg).toContain('#2ca02c')  // A
    expect(svg).toContain('#1f77b4')  // C
    expect(svg).toContain('#111111')  // G
    expect(svg).toContain('#d62728')  // T
  })

  it('contains at least one <path> element', () => {
    const svg = exportSvg(fakeTrace())
    expect(svg).toContain('<path ')
  })

  it('contains <text> elements for base calls', () => {
    const svg = exportSvg(fakeTrace())
    expect(svg).toContain('<text ')
  })

  it('escapes XML special characters in fileName', () => {
    const svg = exportSvg(fakeTrace({ fileName: 'my <trace> & "file".ab1' }))
    expect(svg).toContain('&lt;trace&gt;')
    expect(svg).toContain('&amp;')
    expect(svg).toContain('&quot;')
  })

  it('respects startSample / endSample range', () => {
    const trace = fakeTrace()
    const svgFull = exportSvg(trace)
    const svgWindow = exportSvg(trace, { startSample: 50, endSample: 150 })
    // Both should be valid SVG strings.
    expect(svgFull.startsWith('<svg ')).toBe(true)
    expect(svgWindow.startsWith('<svg ')).toBe(true)
    // Windowed export still has channels.
    expect(svgWindow).toContain('<path ')
  })

  it('handles a trace with no base calls gracefully', () => {
    const trace = fakeTrace({ baseCalls: [], peakPositions: [], sequence: '' })
    const svg = exportSvg(trace)
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).not.toContain('<text ')
  })

  it('handles a single-sample trace without throwing', () => {
    const tiny = new Float32Array([100])
    const trace = fakeTrace({
      sampleCount: 1,
      channels: { A: tiny, C: tiny, G: tiny, T: tiny },
      baseCalls: ['A'],
      peakPositions: [0],
    })
    expect(() => exportSvg(trace)).not.toThrow()
  })

  it('includes aria-label with the file name', () => {
    const svg = exportSvg(fakeTrace({ fileName: 'sample.ab1' }))
    expect(svg).toContain('aria-label="Sanger chromatogram — sample.ab1"')
  })

  it('reflects edited base calls in SVG text labels', () => {
    // Simulate a trace where one base has been manually edited (as buildDisplayTrace does).
    const edited = fakeTrace({
      baseCalls: ['A', 'N', 'G', 'T', 'A'],
      sequence: 'ANGTA',
    })
    const svg = exportSvg(edited)
    // The SVG must contain the edited base 'N' as a text element label.
    expect(svg).toContain('>N</text>')
  })
})
