import { reverseComplementSequence } from '../revcomp'

export type SearchStrand = 'forward' | 'reverse' | 'both'

export interface SubsequenceHit {
  start: number
  end: number
  strand: SearchStrand
}

export interface DisplayRange {
  start: number
  end: number
}

const IUPAC_MASKS: Record<string, number> = {
  A: 1,
  C: 2,
  G: 4,
  T: 8,
  U: 8,
  R: 1 | 4,
  Y: 2 | 8,
  S: 2 | 4,
  W: 1 | 8,
  K: 4 | 8,
  M: 1 | 2,
  B: 2 | 4 | 8,
  D: 1 | 4 | 8,
  H: 1 | 2 | 8,
  V: 1 | 2 | 4,
  N: 1 | 2 | 4 | 8,
  '.': 1 | 2 | 4 | 8,
  '-': 1 | 2 | 4 | 8,
}

export function normalizeSearchQuery(query: string): string {
  return query.replace(/\s+/g, '').toUpperCase()
}

function getBaseMask(base: string): number {
  return IUPAC_MASKS[base.toUpperCase()] ?? 0
}

function basesMatch(sequenceBase: string, queryBase: string): boolean {
  const sequenceMask = getBaseMask(sequenceBase)
  const queryMask = getBaseMask(queryBase)
  return sequenceMask !== 0 && queryMask !== 0 && (sequenceMask & queryMask) !== 0
}

function collectMatches(sequence: string, query: string, strand: Exclude<SearchStrand, 'both'>): SubsequenceHit[] {
  const hits: SubsequenceHit[] = []
  const lastStart = sequence.length - query.length
  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true
    for (let offset = 0; offset < query.length; offset += 1) {
      if (!basesMatch(sequence[start + offset] ?? '', query[offset] ?? '')) {
        matched = false
        break
      }
    }
    if (matched) hits.push({ start, end: start + query.length, strand })
  }
  return hits
}

export function findSubsequenceMatches(sequence: string, query: string): SubsequenceHit[] {
  const normalizedSequence = sequence.toUpperCase()
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedSequence || !normalizedQuery || normalizedQuery.length > normalizedSequence.length) return []

  const merged = new Map<string, SubsequenceHit>()
  const queries: Array<[string, Exclude<SearchStrand, 'both'>]> = [
    [normalizedQuery, 'forward'],
    [reverseComplementSequence(normalizedQuery).toUpperCase(), 'reverse'],
  ]

  for (const [candidate, strand] of queries) {
    for (const hit of collectMatches(normalizedSequence, candidate, strand)) {
      const key = `${hit.start}:${hit.end}`
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, hit)
        continue
      }
      if (existing.strand !== hit.strand) existing.strand = 'both'
    }
  }

  return [...merged.values()].sort((left, right) => {
    if (left.start !== right.start) return left.start - right.start
    if (left.end !== right.end) return left.end - right.end
    const rank = { forward: 0, both: 1, reverse: 2 }
    return rank[left.strand] - rank[right.strand]
  })
}

export function mapCanonicalRangeToDisplay(
  start: number,
  end: number,
  sequenceLength: number,
  isRevcomp: boolean,
): DisplayRange {
  if (!isRevcomp) return { start, end }
  return {
    start: Math.max(0, sequenceLength - end),
    end: Math.max(0, sequenceLength - start),
  }
}
