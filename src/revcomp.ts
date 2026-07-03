import type { TraceData } from './types/trace'

/** Full IUPAC complement table (case-preserving). */
const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', C: 'G', G: 'C',
  R: 'Y', Y: 'R', S: 'S', W: 'W',
  K: 'M', M: 'K', B: 'V', V: 'B',
  D: 'H', H: 'D', N: 'N',
  a: 't', t: 'a', c: 'g', g: 'c',
  r: 'y', y: 'r', s: 's', w: 'w',
  k: 'm', m: 'k', b: 'v', v: 'b',
  d: 'h', h: 'd', n: 'n',
}

/** Return the IUPAC complement of a single base character.  Unknown characters are returned unchanged. */
export function iupacComplement(base: string): string {
  return COMPLEMENT[base] ?? base
}

/** Compute the reverse complement of a sequence string, preserving any unknown characters. */
export function reverseComplementSequence(sequence: string): string {
  return sequence.split('').reverse().map(iupacComplement).join('')
}

/**
 * Produce a new TraceData that represents the reverse complement of the input.
 *
 * - Trace channels: A↔T, C↔G; each new channel is the time-reversed original.
 * - peakPositions: mirrored so position p → (sampleCount − 1 − p), order reversed.
 * - baseCalls: reversed and each base complemented.
 * - qualities: reversed.
 * - sequence: derived from the new baseCalls.
 * - Other fields (format, fileName, sampleCount, metadata) are copied unchanged.
 */
export function reverseComplementTrace(trace: TraceData): TraceData {
  const n = trace.sampleCount

  const reverseFloat32 = (src: Float32Array): Float32Array => {
    const dst = new Float32Array(src.length)
    for (let i = 0; i < src.length; i++) {
      dst[i] = src[src.length - 1 - i]
    }
    return dst
  }

  const channels = {
    A: reverseFloat32(trace.channels.T),
    T: reverseFloat32(trace.channels.A),
    C: reverseFloat32(trace.channels.G),
    G: reverseFloat32(trace.channels.C),
  }

  const len = trace.peakPositions.length
  const peakPositions = new Array<number>(len)
  for (let i = 0; i < len; i++) {
    peakPositions[i] = n - 1 - trace.peakPositions[len - 1 - i]
  }

  const baseCalls = reverseComplementSequence(trace.baseCalls.join('')).split('')
  const qualities = trace.qualities ? trace.qualities.slice().reverse() : null
  const sequence = baseCalls.join('')

  return {
    format: trace.format,
    fileName: trace.fileName,
    sampleCount: n,
    channels,
    baseCalls,
    peakPositions,
    qualities,
    sequence,
    metadata: trace.metadata,
  }
}
