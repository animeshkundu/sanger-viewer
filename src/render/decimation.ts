/**
 * Min-max decimation for trace channel data.
 *
 * Caps canvas path complexity at O(pixelWidth) regardless of trace length or
 * zoom level by collapsing many samples into per-pixel min/max buckets.
 */

export interface DecimatedPoint {
  /** Canvas x-coordinate (pixel column). */
  pixel: number
  /** Minimum signal value in this bucket. */
  min: number
  /** Maximum signal value in this bucket. */
  max: number
}

/**
 * Decimate `data[fromSample..toSample]` into at most `pixelWidth` points.
 *
 * - When samplesPerPixel ≤ 1 (zoomed in): returns one point per integer
 *   sample so smooth interpolation is preserved. `pixel` is the fractional
 *   canvas x for that sample.
 * - When samplesPerPixel > 1 (zoomed out): returns one min/max bucket per
 *   pixel column so the path never contains more points than the canvas is
 *   wide.
 *
 * @param data        Float32Array of signal values for one channel.
 * @param fromSample  First sample index to include (inclusive, clamped to 0).
 * @param toSample    Last sample index to include (inclusive, clamped to data.length - 1).
 * @param pixelWidth  Width of the rendering area in CSS pixels.
 * @param startSample Viewport start sample (used to compute pixel x for each point).
 * @param spp         Samples per pixel for the current viewport.
 */
export function decimateSamples(
  data: Float32Array,
  fromSample: number,
  toSample: number,
  pixelWidth: number,
  startSample: number,
  spp: number
): DecimatedPoint[] {
  const from = Math.max(0, Math.floor(fromSample))
  const to = Math.min(data.length - 1, Math.ceil(toSample))
  if (from > to) return []

  const samplesInView = to - from + 1

  if (spp <= 1) {
    // Zoomed in — one point per sample; pixel is the fractional canvas x.
    const result: DecimatedPoint[] = new Array(samplesInView)
    for (let i = 0; i < samplesInView; i += 1) {
      const s = from + i
      const v = data[s]
      result[i] = { pixel: (s - startSample) / spp, min: v, max: v }
    }
    return result
  }

  // Zoomed out — one min/max bucket per pixel column.
  const cols = Math.max(1, Math.ceil(pixelWidth))
  const result: DecimatedPoint[] = []

  for (let col = 0; col < cols; col += 1) {
    // Sample range that maps to this pixel column.
    const sampleStart = startSample + col * spp
    const sampleEnd = sampleStart + spp
    const bucketFrom = Math.max(from, Math.floor(sampleStart))
    const bucketTo = Math.min(to, Math.ceil(sampleEnd) - 1)
    if (bucketFrom > bucketTo) continue

    let min = data[bucketFrom]
    let max = min
    for (let s = bucketFrom + 1; s <= bucketTo; s += 1) {
      const v = data[s]
      if (v < min) min = v
      if (v > max) max = v
    }
    result.push({ pixel: col, min, max })
  }

  return result
}
