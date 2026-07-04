import { reverseComplementSequence } from '../revcomp'
import { COMMON_RESTRICTION_ENZYMES } from '../annotations'
import type { RestrictionEnzyme } from '../annotations'

export interface RestrictionSitePosition {
  id: string
  enzymeName: string
  recognitionSequence: string
  strand: '+' | '-'
  position: number
  endPosition: number
  startIndex: number
  endIndex: number
}

function findAllOccurrences(sequence: string, motif: string): number[] {
  const indices: number[] = []
  if (!motif.length || sequence.length < motif.length) return indices

  let searchFrom = 0
  while (searchFrom <= sequence.length - motif.length) {
    const found = sequence.indexOf(motif, searchFrom)
    if (found < 0) break
    indices.push(found)
    searchFrom = found + 1
  }

  return indices
}

function createSite(
  enzyme: RestrictionEnzyme,
  startIndex: number,
  sequenceLength: number,
  strand: '+' | '-',
): RestrictionSitePosition {
  const motifLength = enzyme.recognitionSequence.length
  const endIndex = (startIndex + motifLength) % sequenceLength
  const endPosition = ((startIndex + motifLength - 1) % sequenceLength) + 1
  return {
    id: `site:${enzyme.name}:${strand}:${startIndex}`,
    enzymeName: enzyme.name,
    recognitionSequence: enzyme.recognitionSequence,
    strand,
    position: startIndex + 1,
    endPosition,
    startIndex,
    endIndex,
  }
}

export function findRestrictionSites(
  sequenceInput: string,
  enzymes: RestrictionEnzyme[] = COMMON_RESTRICTION_ENZYMES,
  options: { circular?: boolean } = {},
): RestrictionSitePosition[] {
  const sequence = sequenceInput.toUpperCase()
  const sequenceLength = sequence.length
  if (!sequenceLength) return []

  const circular = options.circular ?? false
  const sites: RestrictionSitePosition[] = []

  for (const enzyme of enzymes) {
    const motif = enzyme.recognitionSequence.toUpperCase()
    if (!motif.length || motif.length > sequenceLength) continue

    const searchSpace = circular ? sequence + sequence.slice(0, motif.length - 1) : sequence
    const forwardHits = findAllOccurrences(searchSpace, motif)
    for (const hit of forwardHits) {
      if (hit >= sequenceLength) continue
      sites.push(createSite(enzyme, hit, sequenceLength, '+'))
    }

    const reverseMotif = reverseComplementSequence(motif).toUpperCase()
    if (reverseMotif !== motif) {
      const reverseHits = findAllOccurrences(searchSpace, reverseMotif)
      for (const hit of reverseHits) {
        if (hit >= sequenceLength) continue
        sites.push(createSite(enzyme, hit, sequenceLength, '-'))
      }
    }
  }

  return sites.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    if (a.enzymeName !== b.enzymeName) return a.enzymeName.localeCompare(b.enzymeName)
    return a.strand.localeCompare(b.strand)
  })
}
