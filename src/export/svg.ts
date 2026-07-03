/**
 * SVG export — pure function, no DOM, no canvas.
 *
 * Produces a complete SVG string that faithfully mirrors the chromatogram
 * canvas rendering: decimated trace lines for each channel (A/C/G/T) plus
 * base-call text labels at each visible peak position.
 *
 * Because it is a pure function with no side-effects it is directly testable
 * in Vitest's node environment.
 */

import { TRACE_COLORS } from '../render/colors'
import { clampViewport } from '../render/viewport'
import { decimateSamples } from '../render/decimation'
import type { TraceData } from '../types/trace'

export interface SvgExportOptions {
  /** Output SVG width in pixels (default 1200). */
  width?: number
  /** Output SVG height in pixels (default 400). */
  height?: number
  /** First sample index to render (default 0). */
  startSample?: number
  /** Last sample index to render (default trace.sampleCount - 1). */
  endSample?: number
}

/**
 * Render a trace (or a windowed sub-range) as an SVG string.
 *
 * The resulting string starts with `<svg xmlns="http://www.w3.org/2000/svg" …`
 * and can be saved directly as a .svg file or embedded in HTML.
 */
export function exportSvg(trace: TraceData, options: SvgExportOptions = {}): string {
  const width = options.width ?? 1200
  const height = options.height ?? 400

  // Determine the sample range to render.
  const rawStart = options.startSample ?? 0
  const rawEnd = options.endSample ?? trace.sampleCount - 1
  const rangeCount = Math.max(1, rawEnd - rawStart + 1)

  // Derive samplesPerPixel from the requested range so it fills the full width.
  const samplesPerPixel = rangeCount / width

  const vp = clampViewport(rawStart, samplesPerPixel, trace.sampleCount, width)

  // Scan for max amplitude in the visible range (same logic as canvas draw()).
  const channels = trace.channels
  let maxY = 1
  const scanFrom = Math.max(0, Math.floor(vp.startSample))
  const scanTo = Math.min(trace.sampleCount - 1, Math.ceil(vp.endSample))
  ;(['A', 'C', 'G', 'T'] as const).forEach((base) => {
    const values = channels[base]
    for (let i = scanFrom; i <= scanTo; i += 1) {
      if (values[i] > maxY) maxY = values[i]
    }
  })

  const parts: string[] = []

  // ── Background ──────────────────────────────────────────────────────────────
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`)

  // ── Trace lines ─────────────────────────────────────────────────────────────
  ;(['A', 'C', 'G', 'T'] as const).forEach((base) => {
    const color = TRACE_COLORS[base]
    const data = channels[base]
    const points = decimateSamples(data, vp.startSample, vp.endSample, width, vp.startSample, vp.samplesPerPixel)

    if (points.length === 0) return

    let d = ''
    if (vp.samplesPerPixel <= 1) {
      // Zoomed in — continuous polyline.
      let started = false
      for (const { pixel, max } of points) {
        const y = height * 0.85 - (max / maxY) * height * 0.7
        if (!started) {
          d += `M${pixel.toFixed(2)},${y.toFixed(2)}`
          started = true
        } else {
          d += `L${pixel.toFixed(2)},${y.toFixed(2)}`
        }
      }
    } else {
      // Zoomed out — discrete vertical segments per pixel column.
      for (const { pixel, min, max } of points) {
        const yMax = height * 0.85 - (max / maxY) * height * 0.7
        const yMin = height * 0.85 - (min / maxY) * height * 0.7
        d += `M${pixel.toFixed(2)},${yMin.toFixed(2)}L${pixel.toFixed(2)},${yMax.toFixed(2)}`
      }
    }

    if (d) {
      parts.push(
        `<path d="${d}" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      )
    }
  })

  // ── Base-call labels ─────────────────────────────────────────────────────────
  const labelParts: string[] = []
  for (let i = 0; i < trace.peakPositions.length; i += 1) {
    const peak = trace.peakPositions[i]
    if (peak < vp.startSample || peak > vp.endSample) continue
    const x = (peak - vp.startSample) / vp.samplesPerPixel
    const baseChar = (trace.baseCalls[i] ?? 'N').toUpperCase()
    const color = (TRACE_COLORS as Record<string, string>)[baseChar] ?? '#444444'
    labelParts.push(
      `<text x="${x.toFixed(2)}" y="${(height - 2).toFixed(2)}" ` +
        `text-anchor="middle" dominant-baseline="auto" ` +
        `font-family="ui-monospace,monospace" font-size="11" fill="${color}">${escapeXml(baseChar)}</text>`
    )
  }

  if (labelParts.length > 0) {
    // Group labels for readability.
    parts.push(`<g aria-label="Base calls">${labelParts.join('')}</g>`)
  }

  // ── Assemble SVG ─────────────────────────────────────────────────────────────
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" ` +
    `role="img" aria-label="Sanger chromatogram — ${escapeXml(trace.fileName)}">` +
    parts.join('') +
    `</svg>`
  )
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
