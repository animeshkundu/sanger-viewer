export interface Viewport {
  startSample: number
  endSample: number
  samplesPerPixel: number
}

export interface BaseRange {
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

function lowerBound(values: readonly number[], target: number): number {
  let low = 0
  let high = values.length
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2)
    if ((values[mid] ?? Number.POSITIVE_INFINITY) < target) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

/**
 * Convert a sample-space viewport into display-sequence base bounds.
 * Returned range is 0-based half-open: [start, end).
 */
export function mapSampleViewportToBaseRange(
  peakPositions: readonly number[],
  viewport: Pick<Viewport, 'startSample' | 'endSample'>,
  paddingBases = 0,
): BaseRange {
  const total = peakPositions.length
  if (total === 0) return { start: 0, end: 0 }

  const firstVisible = lowerBound(peakPositions, viewport.startSample)
  const afterLastVisible = lowerBound(peakPositions, viewport.endSample + Number.EPSILON)
  const hasVisible = firstVisible < afterLastVisible

  if (!hasVisible) {
    const nearest = Math.max(0, Math.min(total - 1, firstVisible))
    return {
      start: Math.max(0, nearest - paddingBases),
      end: Math.min(total, nearest + 1 + paddingBases),
    }
  }

  return {
    start: Math.max(0, firstVisible - paddingBases),
    end: Math.min(total, afterLastVisible + paddingBases),
  }
}
