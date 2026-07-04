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

export function lowerBound(values: number[], target: number, from = 0, to = values.length): number {
  let lo = Math.max(0, from)
  let hi = Math.min(values.length, to)
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function upperBound(values: number[], target: number, from = 0, to = values.length): number {
  let lo = Math.max(0, from)
  let hi = Math.min(values.length, to)
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function findVisiblePeakRange(
  peakPositions: number[],
  viewport: SampleViewportRange,
): BaseViewportRange {
  if (peakPositions.length === 0) return { start: 0, end: 0 }
  const start = lowerBound(peakPositions, viewport.startSample)
  const end = upperBound(peakPositions, viewport.endSample, start)
  return { start, end: Math.max(start, end) }
}

export function findNearestPeakIndex(
  peakPositions: number[],
  samplePosition: number,
  range: BaseViewportRange = { start: 0, end: peakPositions.length },
): number {
  const start = Math.max(0, Math.min(range.start, peakPositions.length))
  const end = Math.max(start, Math.min(range.end, peakPositions.length))
  if (start >= end) return -1

  const insertion = lowerBound(peakPositions, samplePosition, start, end)
  const leftIndex = insertion - 1
  const rightIndex = insertion

  if (leftIndex < start) return rightIndex < end ? rightIndex : -1
  if (rightIndex >= end) return leftIndex

  const leftDistance = Math.abs((peakPositions[leftIndex] ?? 0) - samplePosition)
  const rightDistance = Math.abs((peakPositions[rightIndex] ?? 0) - samplePosition)
  return rightDistance < leftDistance ? rightIndex : leftIndex
}

export function mapSampleViewportToBaseRange(
  peakPositions: number[],
  viewport: SampleViewportRange,
  extraBases = 0,
): BaseViewportRange {
  if (peakPositions.length === 0) return { start: 0, end: 0 }

  const visibleRange = findVisiblePeakRange(peakPositions, viewport)
  const expandedStart = Math.max(0, visibleRange.start - 1 - extraBases)
  const expandedEnd = Math.min(peakPositions.length, visibleRange.end + 1 + extraBases)

  return {
    start: expandedStart,
    end: Math.max(expandedStart, expandedEnd),
  }
}
