import { reverseComplementSequence } from '../revcomp'

export type MatchStrand = 'forward' | 'reverse' | 'both'

export interface SubsequenceMatch {
  start: number
  end: number
  strand: MatchStrand
}

const IUPAC_MASKS: Record<string, number> = {
  A: 0b000001,
  C: 0b000010,
  G: 0b000100,
  T: 0b001000,
  U: 0b001000,
  R: 0b000101,
  Y: 0b001010,
  S: 0b000110,
  W: 0b001001,
  K: 0b001100,
  M: 0b000011,
  B: 0b001110,
  D: 0b001101,
  H: 0b001011,
  V: 0b000111,
  N: 0b001111,
  '-': 0b010000,
  '.': 0b100000,
}

function normalizeSequence(value: string): string {
  return value.toUpperCase()
}

function maskFor(base: string): number | null {
  return IUPAC_MASKS[base] ?? null
}

function basesMatch(sequenceBase: string, queryBase: string): boolean {
  const sequenceMask = maskFor(sequenceBase)
  const queryMask = maskFor(queryBase)
  if (sequenceMask === null || queryMask === null) return sequenceBase === queryBase
  return (sequenceMask & queryMask) !== 0
}

function findSingleStrandMatches(sequence: string, query: string): Array<Pick<SubsequenceMatch, 'start' | 'end'>> {
  const matches: Array<Pick<SubsequenceMatch, 'start' | 'end'>> = []
  const lastStart = sequence.length - query.length
  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true
    for (let offset = 0; offset < query.length; offset += 1) {
      if (!basesMatch(sequence[start + offset] ?? '', query[offset] ?? '')) {
        matched = false
        break
      }
    }
    if (matched) matches.push({ start, end: start + query.length })
  }
  return matches
}

export function normalizeSearchQuery(query: string): string {
  return normalizeSequence(query).replace(/\s+/g, '')
}

export function mapCanonicalRangeToDisplayRange(
  range: Pick<SubsequenceMatch, 'start' | 'end'>,
  sequenceLength: number,
  isReverseDisplay: boolean,
): Pick<SubsequenceMatch, 'start' | 'end'> {
  if (!isReverseDisplay) return { start: range.start, end: range.end }
  return {
    start: sequenceLength - range.end,
    end: sequenceLength - range.start,
  }
}

export function mapCanonicalMatchesToDisplay(
  matches: SubsequenceMatch[],
  sequenceLength: number,
  isReverseDisplay: boolean,
): SubsequenceMatch[] {
  return matches.map((match) => ({
    ...match,
    ...mapCanonicalRangeToDisplayRange(match, sequenceLength, isReverseDisplay),
  }))
}

export function findSubsequenceMatches(sequence: string, query: string): SubsequenceMatch[] {
  const normalizedSequence = normalizeSequence(sequence)
  const normalizedQuery = normalizeSearchQuery(query)

  if (!normalizedQuery || normalizedQuery.length > normalizedSequence.length) return []

  const hits = new Map<string, SubsequenceMatch>()
  const addMatches = (strand: Exclude<MatchStrand, 'both'>, strandQuery: string) => {
    for (const match of findSingleStrandMatches(normalizedSequence, strandQuery)) {
      const key = `${match.start}:${match.end}`
      const existing = hits.get(key)
      if (!existing) {
        hits.set(key, { ...match, strand })
        continue
      }
      if (existing.strand !== strand) existing.strand = 'both'
    }
  }

  addMatches('forward', normalizedQuery)
  addMatches('reverse', reverseComplementSequence(normalizedQuery).toUpperCase())

  return [...hits.values()].sort((left, right) => left.start - right.start || left.end - right.end)
}
