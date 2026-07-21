export const MAX_QUALITY_BAR_HEIGHT = 40
const MAX_PHRED_FOR_HEIGHT = 40

export type QualityTier = 'poor' | 'fair' | 'good' | 'excellent'

export interface QualityBar {
  baseIndex: number
  score: number
  x: number
  height: number
  tier: QualityTier
  cssVar: '--color-qual-poor' | '--color-qual-fair' | '--color-qual-good' | '--color-qual-excellent'
}

export function getQualityTier(score: number): Pick<QualityBar, 'tier' | 'cssVar'> {
  if (score >= 40) return { tier: 'excellent', cssVar: '--color-qual-excellent' }
  if (score >= 30) return { tier: 'good', cssVar: '--color-qual-good' }
  if (score >= 20) return { tier: 'fair', cssVar: '--color-qual-fair' }
  return { tier: 'poor', cssVar: '--color-qual-poor' }
}

export function computeQualityBars(
  qualities: number[] | null,
  peakPositions: number[],
  startSample: number,
  samplesPerPixel: number,
  canvasWidth: number,
  trimStart = 0,
  trimEnd = peakPositions.length,
): QualityBar[] {
  if (!qualities || peakPositions.length === 0 || samplesPerPixel <= 0 || canvasWidth <= 0) return []
  const from = Math.max(0, trimStart)
  const to = Math.min(trimEnd, peakPositions.length, qualities.length)
  const bars: QualityBar[] = []
  for (let i = from; i < to; i += 1) {
    const peak = peakPositions[i]
    if (!Number.isFinite(peak)) continue
    const x = (peak - startSample) / samplesPerPixel
    if (x < 0 || x > canvasWidth) continue
    const score = Math.max(0, Math.round(qualities[i] ?? 0))
    const scaled = Math.round((Math.min(score, MAX_PHRED_FOR_HEIGHT) / MAX_PHRED_FOR_HEIGHT) * MAX_QUALITY_BAR_HEIGHT)
    const height = score === 0 ? 1 : Math.max(1, Math.min(MAX_QUALITY_BAR_HEIGHT, scaled))
    const tier = getQualityTier(score)
    bars.push({ baseIndex: i, score, x, height, ...tier })
  }
  return bars
}
