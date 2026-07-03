import { reverseComplementSequence } from '../revcomp'
import type { OrfFeature } from './types'

const START_CODON = 'ATG'
const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA'])

function isCanonicalCodon(codon: string): boolean {
  return codon.length === 3 && /^[ACGT]{3}$/.test(codon)
}

function rowFor(strand: '+' | '-', frame: 1 | 2 | 3): OrfFeature['row'] {
  const plusRows: Record<1 | 2 | 3, 'orf+1' | 'orf+2' | 'orf+3'> = {
    1: 'orf+1',
    2: 'orf+2',
    3: 'orf+3',
  }
  const minusRows: Record<1 | 2 | 3, 'orf-1' | 'orf-2' | 'orf-3'> = {
    1: 'orf-1',
    2: 'orf-2',
    3: 'orf-3',
  }
  return strand === '+' ? plusRows[frame] : minusRows[frame]
}

/**
 * Detect ORFs in all six frames for a display sequence.
 * Output ranges are in display-sequence coordinates and use [start, end).
 */
export function detectOrfFeatures(sequence: string): OrfFeature[] {
  const normalized = sequence.toUpperCase()
  const reverse = reverseComplementSequence(normalized)
  const features: OrfFeature[] = []

  const scanStrand = (strandSequence: string, strand: '+' | '-') => {
    for (let frameOffset = 0; frameOffset < 3; frameOffset += 1) {
      let orfStart: number | null = null
      for (let codonStart = frameOffset; codonStart + 3 <= strandSequence.length; codonStart += 3) {
        const codon = strandSequence.slice(codonStart, codonStart + 3)
        if (!isCanonicalCodon(codon)) {
          orfStart = null
          continue
        }
        if (orfStart === null) {
          if (codon === START_CODON) orfStart = codonStart
          continue
        }
        if (!STOP_CODONS.has(codon)) continue

        const frame = (frameOffset + 1) as 1 | 2 | 3
        const strandStart = orfStart
        const strandEnd = codonStart + 3
        const [start, end] = strand === '+'
          ? [strandStart, strandEnd]
          : [normalized.length - strandEnd, normalized.length - strandStart]
        features.push({
          id: `orf:${strand}:${frame}:${start}-${end}`,
          type: 'orf',
          name: `ORF ${strand}${frame}`,
          strand,
          frame,
          row: rowFor(strand, frame),
          start,
          end,
        })
        orfStart = null
      }
    }
  }

  scanStrand(normalized, '+')
  scanStrand(reverse, '-')

  return features.sort((a, b) => a.start - b.start || a.end - b.end || a.name.localeCompare(b.name))
}
