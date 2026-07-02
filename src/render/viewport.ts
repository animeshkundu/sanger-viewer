export interface Viewport {
  startSample: number
  endSample: number
  samplesPerPixel: number
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
