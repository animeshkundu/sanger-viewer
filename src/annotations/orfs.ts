import { reverseComplementSequence } from '../revcomp'
import type { OrfFeature } from './types'

const START_CODON = 'ATG'
const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA'])

function isCanonicalCodon(codon: string): boolean {
  return codon.length === 3 && /^[ACGT]{3}$/.test(codon)
}

function detectFrameOrfs(sequence: string, frameOffset: number): Array<{ start: number; end: number }> {
  const features: Array<{ start: number; end: number }> = []
  let orfStart = -1

  for (let i = frameOffset; i + 2 < sequence.length; i += 3) {
    const codon = sequence.slice(i, i + 3)
    if (!isCanonicalCodon(codon)) {
      orfStart = -1
      continue
    }

    if (orfStart < 0) {
      if (codon === START_CODON) orfStart = i
      continue
    }

    if (STOP_CODONS.has(codon)) {
      features.push({ start: orfStart, end: i + 3 })
      orfStart = -1
    }
  }

  return features
}

export function detectOrfFeatures(displaySequence: string): OrfFeature[] {
  const sequence = displaySequence.toUpperCase()
  const forward: OrfFeature[] = []

  for (let frameOffset = 0; frameOffset < 3; frameOffset += 1) {
    const frame = frameOffset + 1
    for (const range of detectFrameOrfs(sequence, frameOffset)) {
      forward.push({
        id: `orf:+${frame}:${range.start}-${range.end}`,
        type: 'orf',
        strand: '+',
        frame,
        start: range.start,
        end: range.end,
        label: `ORF +${frame}`,
      })
    }
  }

  const reverseSequence = reverseComplementSequence(sequence).toUpperCase()
  const reverse: OrfFeature[] = []

  for (let frameOffset = 0; frameOffset < 3; frameOffset += 1) {
    const frame = -(frameOffset + 1)
    for (const range of detectFrameOrfs(reverseSequence, frameOffset)) {
      const start = sequence.length - range.end
      const end = sequence.length - range.start
      reverse.push({
        id: `orf:${frame}:${start}-${end}`,
        type: 'orf',
        strand: '-',
        frame,
        start,
        end,
        label: `ORF ${frame}`,
      })
    }
  }

  return [...forward, ...reverse].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (a.end !== b.end) return a.end - b.end
    return a.frame - b.frame
  })
}
