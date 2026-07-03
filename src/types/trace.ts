export type Nucleotide = 'A' | 'C' | 'G' | 'T'

export interface TraceData {
  format: 'ab1' | 'scf'
  fileName: string
  sampleCount: number
  channels: Record<Nucleotide, Float32Array>
  baseCalls: string[]
  peakPositions: number[]
  qualities: number[] | null
  sequence: string
  metadata: Record<string, string | number>
}

export interface BaseHoverInfo {
  index: number
  base: string
  samplePosition: number
  quality: number | null
}

/**
 * Trim region boundaries for canvas overlay rendering.
 * Both indices are into the baseCalls / peakPositions arrays.
 * trimStart is the first kept base (inclusive); trimEnd is exclusive.
 * null means "not yet computed" or "no trim applied".
 */
export interface TrimBoundaries {
  trimStart: number
  trimEnd: number
}
