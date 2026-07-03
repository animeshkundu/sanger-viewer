export type Nucleotide = 'A' | 'C' | 'G' | 'T'

export interface TraceMetadata {
  sampleName?: string
  instrument?: string
  model?: string
  runDate?: string
  dyeSet?: string
  baseCaller?: string
  comment?: string
  lane?: number
  version?: number
}

export interface TraceData {
  format: 'ab1' | 'scf'
  fileName: string
  sampleCount: number
  channels: Record<Nucleotide, Float32Array>
  baseCalls: string[]
  peakPositions: number[]
  qualities: number[] | null
  sequence: string
  metadata: TraceMetadata
}

export interface BaseHoverInfo {
  index: number
  base: string
  samplePosition: number
  quality: number | null
  amplitudes: { A: number; C: number; G: number; T: number }
}

/**
 * Trim region boundaries for canvas overlay rendering.
 * Both indices are into the baseCalls / peakPositions arrays.
 * trimStart is the first kept base (inclusive); trimEnd is exclusive.
 */
export interface TrimBoundaries {
  trimStart: number
  trimEnd: number
}
