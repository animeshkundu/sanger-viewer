export interface Viewport {
  startSample: number
  endSample: number
  samplesPerPixel: number
}

export interface SampleViewportRange {
  startSample: number
  endSample: number
}

export interface BaseViewportRange {
  start: number
  end: number
}

export function clampViewport(startSample: number, samplesPerPixel: number, totalSamples: number, width: number): Viewport {
  const clampedSamplesPerPixel = Math.max(0.5, samplesPerPixel)
  const visibleSamples = Math.max(1, width * clampedSamplesPerPixel)
  const maxStart = Math.max(0, totalSamples - visibleSamples)
  const clampedStart = Math.max(0, Math.min(startSample, maxStart))
  return {
    startSample: clampedStart,
    endSample: Math.min(totalSamples, clampedStart + visibleSamples),
    samplesPerPixel: clampedSamplesPerPixel
  }
}

function lowerBound(values: number[], target: number): number {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

function upperBound(values: number[], target: number): number {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function mapSampleViewportToBaseRange(
  peakPositions: number[],
  viewport: SampleViewportRange,
  extraBases = 0,
): BaseViewportRange {
  if (peakPositions.length === 0) return { start: 0, end: 0 }

  const firstVisible = lowerBound(peakPositions, viewport.startSample)
  const afterLastVisible = upperBound(peakPositions, viewport.endSample)

  const expandedStart = Math.max(0, firstVisible - 1 - extraBases)
  const expandedEnd = Math.min(peakPositions.length, afterLastVisible + 1 + extraBases)

  return {
    start: expandedStart,
    end: Math.max(expandedStart, expandedEnd),
  }
}
