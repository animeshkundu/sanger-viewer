import { describe, expect, it } from 'vitest'
import { decodePermalinkState, encodePermalinkState, type PermalinkStateV1 } from '../../src/workspace/permalink'

describe('permalink codec', () => {
  it('round-trips exact state values', () => {
    const state: PermalinkStateV1 = {
      version: 1,
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 120, samplesPerPixel: 3, strand: 'reverse' },
      trim: { mode: 'trimmed', threshold: 24 },
      search: { query: 'ACGT', activeIndex: 1 },
      selection: { baseIndex: 42 },
      edits: [
        { forwardIndex: 5, base: 'N', originalBase: 'A' },
        { forwardIndex: 88, base: 'R', originalBase: 'G' },
      ],
      tracks: { quality: false, annotations: true },
    }

    const encoded = encodePermalinkState(state)
    expect(encoded.oversized).toBe(false)
    expect(encoded.hash).toMatch(/^#sv=/)
    expect(decodePermalinkState(encoded.hash!)).toEqual(state)
  })

  it('rejects malformed or unsupported hashes', () => {
    expect(decodePermalinkState('#not-a-permalink')).toBeNull()
    expect(decodePermalinkState('#sv=%%%')).toBeNull()
  })

  it('reports oversize states when the hash would exceed limits', () => {
    const oversizedState: PermalinkStateV1 = {
      version: 1,
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 0, samplesPerPixel: 1, strand: 'forward' },
      trim: { mode: 'full', threshold: 20 },
      search: { query: 'A'.repeat(300), activeIndex: 0 },
      selection: null,
      edits: [],
      tracks: { quality: true, annotations: true },
    }
    const encoded = encodePermalinkState(oversizedState, { maxChars: 30 })
    expect(encoded).toEqual({ hash: null, oversized: true })
  })
})
