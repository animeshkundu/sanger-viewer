import { getQualityTier } from './qualityBars'
import type { QualityTier } from './qualityBars'

export interface QualityHeatmapCell {
  baseIndex: number
  score: number
  x: number
  width: number
  tier: QualityTier
  cssVar: '--color-qual-poor' | '--color-qual-fair' | '--color-qual-good' | '--color-qual-excellent'
}

export interface QualityHeatmapRun {
  x: number
  width: number
  tier: QualityTier
  cssVar: QualityHeatmapCell['cssVar']
}

const TIER_LEVELS: Record<QualityTier, number> = {
  excellent: 1,
  good: 2,
  fair: 3,
  poor: 4,
}

const LEVEL_STYLES: Array<Pick<QualityHeatmapRun, 'tier' | 'cssVar'> | null> = [
  null,
  { tier: 'excellent', cssVar: '--color-qual-excellent' },
  { tier: 'good', cssVar: '--color-qual-good' },
  { tier: 'fair', cssVar: '--color-qual-fair' },
  { tier: 'poor', cssVar: '--color-qual-poor' },
]

function midpoint(left: number, right: number): number {
  return left + (right - left) / 2
}

export function computeQualityHeatmapCells(
  qualities: number[] | null,
  peakPositions: number[],
  startSample: number,
  samplesPerPixel: number,
  canvasWidth: number,
  trimStart = 0,
  trimEnd = peakPositions.length,
): QualityHeatmapCell[] {
  if (!qualities || peakPositions.length === 0 || samplesPerPixel <= 0 || canvasWidth <= 0) return []

  const from = Math.max(0, trimStart)
  const to = Math.min(trimEnd, peakPositions.length, qualities.length)
  const cells: QualityHeatmapCell[] = []

  for (let i = from; i < to; i += 1) {
    const peak = peakPositions[i]
    if (!Number.isFinite(peak)) continue

    const previousPeak = i > 0 && Number.isFinite(peakPositions[i - 1])
      ? peakPositions[i - 1]
      : null
    const nextPeak = i + 1 < peakPositions.length && Number.isFinite(peakPositions[i + 1])
      ? peakPositions[i + 1]
      : null
    const leftSample = previousPeak === null
      ? nextPeak === null ? peak - samplesPerPixel / 2 : peak - (nextPeak - peak) / 2
      : midpoint(previousPeak, peak)
    const rightSample = nextPeak === null
      ? previousPeak === null ? peak + samplesPerPixel / 2 : peak + (peak - previousPeak) / 2
      : midpoint(peak, nextPeak)
    const unclippedLeft = (leftSample - startSample) / samplesPerPixel
    const unclippedRight = (rightSample - startSample) / samplesPerPixel
    const x = Math.max(0, unclippedLeft)
    const right = Math.min(canvasWidth, unclippedRight)
    if (right <= x) continue

    const score = Math.max(0, Math.round(qualities[i] ?? 0))
    cells.push({
      baseIndex: i,
      score,
      x,
      width: right - x,
      ...getQualityTier(score),
    })
  }

  return cells
}

export function computeQualityHeatmapRuns(
  cells: QualityHeatmapCell[],
  canvasWidth: number,
  devicePixelRatio: number,
): QualityHeatmapRun[] {
  if (cells.length === 0 || canvasWidth <= 0 || devicePixelRatio <= 0) return []

  const pixelWidth = Math.max(1, Math.floor(canvasWidth * devicePixelRatio))
  const levels = new Uint8Array(pixelWidth)
  for (const cell of cells) {
    const from = Math.max(0, Math.floor(cell.x * devicePixelRatio))
    const to = Math.min(pixelWidth, Math.ceil((cell.x + cell.width) * devicePixelRatio))
    const level = TIER_LEVELS[cell.tier]
    for (let pixel = from; pixel < to; pixel += 1) {
      levels[pixel] = Math.max(levels[pixel], level)
    }
  }

  const runs: QualityHeatmapRun[] = []
  let runStart = 0
  let runLevel = levels[0]
  for (let pixel = 1; pixel <= pixelWidth; pixel += 1) {
    const level = pixel < pixelWidth ? levels[pixel] : 0
    if (level === runLevel) continue
    const style = LEVEL_STYLES[runLevel]
    if (style) {
      runs.push({
        x: runStart / devicePixelRatio,
        width: (pixel - runStart) / devicePixelRatio,
        ...style,
      })
    }
    runStart = pixel
    runLevel = level
  }
  return runs
}

export function findQualityHeatmapCell(
  cells: QualityHeatmapCell[],
  x: number,
): QualityHeatmapCell | null {
  if (!Number.isFinite(x)) return null

  let low = 0
  let high = cells.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const cell = cells[middle]
    if (x < cell.x) {
      high = middle - 1
    } else if (x >= cell.x + cell.width) {
      low = middle + 1
    } else {
      return cell
    }
  }
  return null
}
