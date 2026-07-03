import { reverseComplementSequence } from '../revcomp'
import type { RestrictionFeature } from './types'

export interface RestrictionEnzyme {
  name: string
  recognitionSequence: string
  cutOffsetTop: number
  cutOffsetBottom: number
}

export const COMMON_RESTRICTION_ENZYMES: RestrictionEnzyme[] = [
  { name: 'EcoRI', recognitionSequence: 'GAATTC', cutOffsetTop: 1, cutOffsetBottom: 5 },
  { name: 'HindIII', recognitionSequence: 'AAGCTT', cutOffsetTop: 1, cutOffsetBottom: 5 },
  { name: 'BsaI', recognitionSequence: 'GGTCTC', cutOffsetTop: 1, cutOffsetBottom: 5 },
]

function enzymeCutsForMatch(
  start: number,
  end: number,
  enzyme: RestrictionEnzyme,
  strand: '+' | '-',
): [number, number] {
  if (strand === '+') {
    return [start + enzyme.cutOffsetTop, start + enzyme.cutOffsetBottom]
  }
  return [end - enzyme.cutOffsetBottom, end - enzyme.cutOffsetTop]
}

function scanForMotif(sequence: string, motif: string): number[] {
  const matches: number[] = []
  let fromIndex = 0
  while (fromIndex <= sequence.length - motif.length) {
    const hit = sequence.indexOf(motif, fromIndex)
    if (hit < 0) break
    matches.push(hit)
    fromIndex = hit + 1
  }
  return matches
}

export function scanRestrictionSiteFeatures(
  sequence: string,
  enzymes: readonly RestrictionEnzyme[] = COMMON_RESTRICTION_ENZYMES,
): RestrictionFeature[] {
  const normalized = sequence.toUpperCase()
  const features: RestrictionFeature[] = []

  for (const enzyme of enzymes) {
    const motif = enzyme.recognitionSequence.toUpperCase()
    const reverseMotif = reverseComplementSequence(motif)
    for (const start of scanForMotif(normalized, motif)) {
      const end = start + motif.length
      features.push({
        id: `restriction:${enzyme.name}:+:${start}-${end}`,
        type: 'restriction',
        name: enzyme.name,
        enzyme: enzyme.name,
        recognitionSequence: motif,
        strand: '+',
        row: 'restriction',
        start,
        end,
        cutPositions: enzymeCutsForMatch(start, end, enzyme, '+'),
      })
    }

    if (reverseMotif === motif) continue

    for (const start of scanForMotif(normalized, reverseMotif)) {
      const end = start + reverseMotif.length
      features.push({
        id: `restriction:${enzyme.name}:-:${start}-${end}`,
        type: 'restriction',
        name: enzyme.name,
        enzyme: enzyme.name,
        recognitionSequence: motif,
        strand: '-',
        row: 'restriction',
        start,
        end,
        cutPositions: enzymeCutsForMatch(start, end, enzyme, '-'),
      })
    }
  }

  return features.sort(
    (a, b) =>
      a.start - b.start ||
      a.end - b.end ||
      a.enzyme.localeCompare(b.enzyme) ||
      a.strand.localeCompare(b.strand),
  )
}
