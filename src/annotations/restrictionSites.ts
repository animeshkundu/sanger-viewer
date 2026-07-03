import { reverseComplementSequence } from '../revcomp'
import type { RestrictionEnzyme, RestrictionSiteFeature } from './types'

export const COMMON_RESTRICTION_ENZYMES: RestrictionEnzyme[] = [
  {
    name: 'EcoRI',
    recognitionSequence: 'GAATTC',
    cutOffsets: { forward: 1, reverse: 5 },
  },
  {
    name: 'BamHI',
    recognitionSequence: 'GGATCC',
    cutOffsets: { forward: 1, reverse: 5 },
  },
  {
    name: 'HindIII',
    recognitionSequence: 'AAGCTT',
    cutOffsets: { forward: 1, reverse: 5 },
  },
  {
    name: 'BsaI',
    recognitionSequence: 'GGTCTC',
    cutOffsets: { forward: 7, reverse: 11 },
  },
]

function findAllOccurrences(sequence: string, motif: string): number[] {
  const indices: number[] = []
  if (!motif.length || sequence.length < motif.length) return indices

  let searchFrom = 0
  while (searchFrom <= sequence.length - motif.length) {
    const index = sequence.indexOf(motif, searchFrom)
    if (index < 0) break
    indices.push(index)
    searchFrom = index + 1
  }

  return indices
}

function createSiteFeature(
  enzyme: RestrictionEnzyme,
  strand: '+' | '-',
  start: number,
  recognitionLength: number,
): RestrictionSiteFeature {
  const end = start + recognitionLength
  const cutForward = strand === '+'
    ? start + enzyme.cutOffsets.forward
    : start + recognitionLength - enzyme.cutOffsets.forward
  const cutReverse = strand === '+'
    ? start + enzyme.cutOffsets.reverse
    : start + recognitionLength - enzyme.cutOffsets.reverse

  return {
    id: `restriction:${enzyme.name}:${strand}:${start}-${end}`,
    type: 'restriction',
    strand,
    enzymeName: enzyme.name,
    recognitionSequence: enzyme.recognitionSequence,
    start,
    end,
    cutForward,
    cutReverse,
    label: `${enzyme.name} (${strand})`,
  }
}

export function scanRestrictionSites(
  displaySequence: string,
  enzymes: RestrictionEnzyme[] = COMMON_RESTRICTION_ENZYMES,
): RestrictionSiteFeature[] {
  const sequence = displaySequence.toUpperCase()
  const features: RestrictionSiteFeature[] = []

  for (const enzyme of enzymes) {
    const motif = enzyme.recognitionSequence.toUpperCase()
    const reverseMotif = reverseComplementSequence(motif).toUpperCase()

    for (const start of findAllOccurrences(sequence, motif)) {
      features.push(createSiteFeature(enzyme, '+', start, motif.length))
    }

    if (reverseMotif !== motif) {
      for (const start of findAllOccurrences(sequence, reverseMotif)) {
        features.push(createSiteFeature(enzyme, '-', start, motif.length))
      }
    }
  }

  return features.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (a.end !== b.end) return a.end - b.end
    return a.enzymeName.localeCompare(b.enzymeName)
  })
}
