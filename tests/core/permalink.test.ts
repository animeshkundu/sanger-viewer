import { describe, expect, it } from 'vitest'
import { decodePermalinkState, encodePermalinkState, type PermalinkStateV1 } from '../../src/workspace/permalink'

const STATE: Omit<PermalinkStateV1, 'version'> = {
  source: { kind: 'sample', value: 'sample.ab1' },
  view: { startSample: 123.5, samplesPerPixel: 2.25 },
  strand: 'reverse',
  trim: { mode: 'trimmed', threshold: 23 },
  search: { query: 'TGAT', activeIndex: 1 },
  selection: { baseIndex: 49 },
  edits: [{ forwardIndex: 10, base: 'N', originalBase: 'A' }],
  overlays: { quality: false, annotations: true, mixedBases: true },
}

describe('permalink codec', () => {
  it('round-trips exact state', () => {
    const encoded = encodePermalinkState(STATE, { maxChars: 1800 })
    expect(encoded.hash).toMatch(/^#sv=/)
    const decoded = decodePermalinkState(encoded.hash!)
    expect(decoded).toEqual({ version: 1, ...STATE })
  })

  it('decodes a known hash payload', () => {
    const knownHash = '#sv=eyJ2ZXJzaW9uIjoxLCJzb3VyY2UiOnsia2luZCI6InNhbXBsZSIsInZhbHVlIjoic2FtcGxlLmFiMSJ9LCJ2aWV3Ijp7InN0YXJ0U2FtcGxlIjoxMjMuNSwic2FtcGxlc1BlclBpeGVsIjoyLjI1fSwic3RyYW5kIjoicmV2ZXJzZSIsInRyaW0iOnsibW9kZSI6InRyaW1tZWQiLCJ0aHJlc2hvbGQiOjIzfSwic2VhcmNoIjp7InF1ZXJ5IjoiVEdBVCIsImFjdGl2ZUluZGV4IjoxfSwic2VsZWN0aW9uIjp7ImJhc2VJbmRleCI6NDl9LCJlZGl0cyI6W3siZm9yd2FyZEluZGV4IjoxMCwiYmFzZSI6Ik4iLCJvcmlnaW5hbEJhc2UiOiJBIn1dLCJvdmVybGF5cyI6eyJxdWFsaXR5IjpmYWxzZSwiYW5ub3RhdGlvbnMiOnRydWUsIm1peGVkQmFzZXMiOnRydWV9fQ'
    expect(decodePermalinkState(knownHash)).toEqual({ version: 1, ...STATE })
  })

  it('rejects oversized payloads', () => {
    const encoded = encodePermalinkState(
      {
        ...STATE,
        edits: Array.from({ length: 400 }, (_, i) => ({ forwardIndex: i, base: 'N', originalBase: 'A' })),
      },
      { maxChars: 200 },
    )
    expect(encoded.hash).toBeNull()
    expect(encoded.error).toContain('too large')
  })
})

