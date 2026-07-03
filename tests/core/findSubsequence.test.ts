import { describe, expect, it } from 'vitest'
import {
  findSubsequenceMatches,
  mapCanonicalRangeToDisplayRange,
  normalizeSearchQuery,
} from '../../src/search/findSubsequence'

describe('findSubsequenceMatches', () => {
  it('matches IUPAC ambiguity codes with explicit indices', () => {
    expect(findSubsequenceMatches('ACGTAC', 'MCG')).toEqual([
      { start: 0, end: 3, strand: 'forward' },
      { start: 1, end: 4, strand: 'reverse' },
    ])
  })

  it('finds reverse-strand matches with canonical indices', () => {
    expect(findSubsequenceMatches('AAGCTTA', 'AAG')).toEqual([
      { start: 0, end: 3, strand: 'forward' },
      { start: 3, end: 6, strand: 'reverse' },
    ])
  })

  it('reverse-complements U-containing queries for reverse-strand hits', () => {
    expect(findSubsequenceMatches('AAG', 'CUU')).toEqual([
      { start: 0, end: 3, strand: 'reverse' },
    ])
  })

  it('keeps overlapping hits with explicit indices', () => {
    expect(findSubsequenceMatches('AAAAA', 'AAA')).toEqual([
      { start: 0, end: 3, strand: 'forward' },
      { start: 1, end: 4, strand: 'forward' },
      { start: 2, end: 5, strand: 'forward' },
    ])
  })

  it('deduplicates palindromic same-interval hits', () => {
    expect(findSubsequenceMatches('ATAT', 'ATAT')).toEqual([
      { start: 0, end: 4, strand: 'both' },
    ])
  })
})

describe('normalizeSearchQuery', () => {
  it('uppercases and removes whitespace', () => {
    expect(normalizeSearchQuery(' a\ncg t ')).toBe('ACGT')
  })
})

describe('mapCanonicalRangeToDisplayRange', () => {
  it('maps canonical ranges into reverse-display coordinates', () => {
    expect(mapCanonicalRangeToDisplayRange({ start: 2, end: 5 }, 10, true)).toEqual({
      start: 5,
      end: 8,
    })
  })
})
