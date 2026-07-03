import { describe, expect, it } from 'vitest'
import { reverseComplementSequence } from '../../src/revcomp'
import { findSubsequenceMatches, mapCanonicalRangeToDisplay } from '../../src/search/findSubsequence'

describe('findSubsequenceMatches', () => {
  it('supports IUPAC ambiguity codes in both the query and sequence', () => {
    expect(findSubsequenceMatches('ASNT', 'S')).toEqual([
      { start: 1, end: 2, strand: 'both' },
      { start: 2, end: 3, strand: 'both' },
    ])
  })

  it('returns overlapping hits', () => {
    expect(findSubsequenceMatches('AAAA', 'AA')).toEqual([
      { start: 0, end: 2, strand: 'forward' },
      { start: 1, end: 3, strand: 'forward' },
      { start: 2, end: 4, strand: 'forward' },
    ])
  })

  it('finds forward and reverse-strand hits in canonical coordinates', () => {
    expect(findSubsequenceMatches('AAGCTTA', 'AAG')).toEqual([
      { start: 0, end: 3, strand: 'forward' },
      { start: 3, end: 6, strand: 'reverse' },
    ])
  })

  it('deduplicates palindromic hits into a single both-strand record', () => {
    expect(findSubsequenceMatches('GAATTC', 'GAATTC')).toEqual([
      { start: 0, end: 6, strand: 'both' },
    ])
  })
})

describe('mapCanonicalRangeToDisplay', () => {
  it('maps reverse-strand hits to the correct visible bases in revcomp view', () => {
    const sequence = 'AAGCTTA'
    const revcomp = reverseComplementSequence(sequence)
    const reverseHit = findSubsequenceMatches(sequence, 'AAG')[1]

    expect(reverseHit).toEqual({ start: 3, end: 6, strand: 'reverse' })

    const displayRange = mapCanonicalRangeToDisplay(reverseHit.start, reverseHit.end, sequence.length, true)
    expect(displayRange).toEqual({ start: 1, end: 4 })
    expect(revcomp.slice(displayRange.start, displayRange.end)).toBe('AAG')
  })
})
