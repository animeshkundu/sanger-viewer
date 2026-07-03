import type { TraceData } from '../types/trace'

const BASES = ['A', 'C', 'G', 'T'] as const
type CanonicalBase = (typeof BASES)[number]

// Two-base IUPAC ambiguity codes (A/C/G/T only), per IUPAC nucleotide notation.
const PAIR_TO_IUPAC: Record<string, string> = {
  AG: 'R',
  CT: 'Y',
  CG: 'S',
  AT: 'W',
  GT: 'K',
  AC: 'M',
}

export const DEFAULT_MIXED_BASE_THRESHOLD = 0.35

export interface MixedBaseResult {
  baseCalls: string[]
  sequence: string
  ambiguousIndices: number[]
  ambiguousCount: number
}

function pairKey(a: CanonicalBase, b: CanonicalBase): string {
  return a < b ? `${a}${b}` : `${b}${a}`
}

function channelAmplitude(trace: TraceData, base: CanonicalBase, sampleIndex: number): number {
  if (!Number.isInteger(sampleIndex) || sampleIndex < 0 || sampleIndex >= trace.sampleCount) return 0
  const value = trace.channels[base][sampleIndex]
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Recompute base calls with optional mixed-base (heterozygote) IUPAC codes.
 *
 * For each base index, the caller samples A/C/G/T amplitudes at that base's peak position,
 * ranks primary/secondary channels, and computes ratio = secondary / primary. When ratio is
 * >= threshold (clamped to [0, 1]), a two-base IUPAC ambiguity code replaces the base call.
 * Invalid peaks or degenerate signal (missing/zero amplitudes) are left unchanged.
 */
export function callMixedBases(trace: TraceData, secondaryPeakRatioThreshold: number): MixedBaseResult {
  const threshold = Number.isFinite(secondaryPeakRatioThreshold)
    ? Math.max(0, Math.min(1, secondaryPeakRatioThreshold))
    : DEFAULT_MIXED_BASE_THRESHOLD

  const baseCalls = trace.baseCalls.slice()
  const ambiguousIndices: number[] = []

  for (let i = 0; i < baseCalls.length; i += 1) {
    const peak = trace.peakPositions[i]
    if (!Number.isInteger(peak) || peak < 0 || peak >= trace.sampleCount) continue

    const ranked = BASES
      .map((base) => ({ base, amplitude: channelAmplitude(trace, base, peak) }))
      .sort((left, right) => right.amplitude - left.amplitude)

    const primary = ranked[0]
    const secondary = ranked[1]
    if (!primary || !secondary) continue
    if (primary.amplitude <= 0 || secondary.amplitude <= 0) continue

    const ratio = secondary.amplitude / primary.amplitude
    if (!Number.isFinite(ratio) || ratio < threshold) continue

    const iupac = PAIR_TO_IUPAC[pairKey(primary.base, secondary.base)]
    if (!iupac) continue

    baseCalls[i] = iupac
    ambiguousIndices.push(i)
  }

  return {
    baseCalls,
    sequence: baseCalls.join(''),
    ambiguousIndices,
    ambiguousCount: ambiguousIndices.length,
  }
}
