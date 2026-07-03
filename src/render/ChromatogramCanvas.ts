import { TRACE_COLORS } from './colors'
import { clampViewport } from './viewport'
import { decimateSamples } from './decimation'
import type { BaseHoverInfo, TrimBoundaries, TraceData } from '../types/trace'

export class ChromatogramCanvas {
  private ctx: CanvasRenderingContext2D
  private trace: TraceData | null = null
  private startSample = 0
  private samplesPerPixel = 5
  private raf = 0
  private trimBoundaries: TrimBoundaries | null = null

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    // ResizeObserver fires after the element has been laid out in the DOM
    // (and on every subsequent size change), so canvas.clientWidth/Height are
    // valid when resize() runs. Calling resize() directly in the constructor
    // runs before the element is appended to the document — clientWidth would
    // be 0, leaving the physical backing buffer at the Math.max(1,…) minimum
    // of 1×1 px and making every getImageData call return only 1 pixel.
    const ro = new ResizeObserver(() => this.resize())
    ro.observe(canvas)
  }

  setTrace(trace: TraceData): void {
    this.trace = trace
    this.startSample = 0
    this.samplesPerPixel = Math.max(1, trace.sampleCount / Math.max(300, this.canvas.clientWidth || 1))
    this.requestDraw()
  }

  fitToScreen(): void {
    if (!this.trace) return
    this.startSample = 0
    this.samplesPerPixel = Math.max(1, this.trace.sampleCount / Math.max(300, this.canvas.clientWidth || 1))
    this.requestDraw()
  }

  zoom(factor: number, centerX = this.canvas.clientWidth / 2): void {
    if (!this.trace) return
    const before = this.startSample + centerX * this.samplesPerPixel
    this.samplesPerPixel = Math.min(40, Math.max(0.5, this.samplesPerPixel * factor))
    this.startSample = before - centerX * this.samplesPerPixel
    this.requestDraw()
  }

  panPixels(deltaX: number): void {
    this.startSample += deltaX * this.samplesPerPixel
    this.requestDraw()
  }

  getCurrentTrace(): TraceData | null {
    return this.trace
  }

  /** Accept new trim boundaries and schedule a repaint. null clears any existing overlay. */
  setTrimBoundaries(boundaries: TrimBoundaries | null): void {
    this.trimBoundaries = boundaries
    // Expose overlay state as a data attribute so E2E tests can assert
    // overlay presence/absence without relying on fragile pixel comparisons.
    this.canvas.setAttribute('data-trim-active', boundaries !== null ? 'true' : 'false')
    this.requestDraw()
  }

  getViewportInfo(): { start: number; end: number } {
    if (!this.trace) return { start: 0, end: 0 }
    const vp = clampViewport(this.startSample, this.samplesPerPixel, this.trace.sampleCount, this.canvas.clientWidth)
    return { start: Math.round(vp.startSample), end: Math.round(vp.endSample) }
  }

  hitTest(clientX: number): BaseHoverInfo | null {
    if (!this.trace) return null
    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const vp = clampViewport(this.startSample, this.samplesPerPixel, this.trace.sampleCount, this.canvas.clientWidth)
    const sampleAtX = vp.startSample + x * vp.samplesPerPixel

    let bestIndex = -1
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < this.trace.peakPositions.length; i += 1) {
      const peak = this.trace.peakPositions[i]
      if (peak < vp.startSample || peak > vp.endSample) continue
      const dx = Math.abs(peak - sampleAtX)
      if (dx < bestDistance) {
        bestDistance = dx
        bestIndex = i
      }
    }

    if (bestIndex < 0) return null
    return {
      index: bestIndex,
      base: this.trace.baseCalls[bestIndex] ?? 'N',
      samplePosition: this.trace.peakPositions[bestIndex] ?? 0,
      quality: this.trace.qualities?.[bestIndex] ?? null
    }
  }

  exportPngBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Unable to export PNG'))
          return
        }
        resolve(blob)
      }, 'image/png')
    })
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, this.canvas.clientWidth)
    const height = Math.max(1, this.canvas.clientHeight)
    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.requestDraw()
  }

  private requestDraw(): void {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.draw()
    })
  }

  private draw(): void {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(0, 0, width, height)
    if (!this.trace) return

    const vp = clampViewport(this.startSample, this.samplesPerPixel, this.trace.sampleCount, width)
    this.startSample = vp.startSample
    this.samplesPerPixel = vp.samplesPerPixel

    const channels = this.trace.channels
    // Scan only the visible range for maxY — O(viewport) instead of O(trace).
    let maxY = 1
    const scanFrom = Math.max(0, Math.floor(vp.startSample))
    const scanTo = Math.min(this.trace.sampleCount - 1, Math.ceil(vp.endSample))
    ;(['A', 'C', 'G', 'T'] as const).forEach((base) => {
      const values = channels[base]
      for (let i = scanFrom; i <= scanTo; i += 1) {
        if (values[i] > maxY) maxY = values[i]
      }
    })

    // ── Trim region overlays (rendered before traces so signal shows through) ──
    this.drawTrimOverlays(vp, width, height)

    for (let i = 0; i < this.trace.peakPositions.length; i += 1) {
      const peak = this.trace.peakPositions[i]
      if (peak < vp.startSample || peak > vp.endSample) continue
      const q = this.trace.qualities?.[i] ?? 0
      const x = (peak - vp.startSample) / vp.samplesPerPixel
      const alpha = Math.min(0.25, q / 220)
      this.ctx.fillStyle = `rgba(255, 220, 120, ${alpha})`
      this.ctx.fillRect(x - 2, 0, 4, height)
    }

    ;(['A', 'C', 'G', 'T'] as const).forEach((base) => {
      this.ctx.strokeStyle = TRACE_COLORS[base]
      this.ctx.lineWidth = 1.2
      this.ctx.beginPath()
      const data = channels[base]
      const points = decimateSamples(data, vp.startSample, vp.endSample, width, vp.startSample, vp.samplesPerPixel)
      if (vp.samplesPerPixel <= 1) {
        // Zoomed in — continuous polyline; decimation returns one point per sample (min === max).
        let started = false
        for (const { pixel, max } of points) {
          const y = height * 0.85 - (max / maxY) * height * 0.7
          if (!started) {
            this.ctx.moveTo(pixel, y)
            started = true
          } else {
            this.ctx.lineTo(pixel, y)
          }
        }
      } else {
        // Zoomed out — draw each pixel column as a discrete vertical segment so adjacent
        // columns are not connected by diagonal lines that don't correspond to the signal.
        for (const { pixel, min, max } of points) {
          const yMax = height * 0.85 - (max / maxY) * height * 0.7
          const yMin = height * 0.85 - (min / maxY) * height * 0.7
          this.ctx.moveTo(pixel, yMin)
          this.ctx.lineTo(pixel, yMax)
        }
      }
      this.ctx.stroke()
    })

    this.ctx.font = '11px ui-monospace, monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'bottom'

    for (let i = 0; i < this.trace.peakPositions.length; i += 1) {
      const peak = this.trace.peakPositions[i]
      if (peak < vp.startSample || peak > vp.endSample) continue
      const x = (peak - vp.startSample) / vp.samplesPerPixel
      const base = (this.trace.baseCalls[i] ?? 'N').toUpperCase() as keyof typeof TRACE_COLORS
      this.ctx.fillStyle = TRACE_COLORS[base] ?? '#444'
      this.ctx.fillText(base, x, height - 2)
    }
  }

  /**
   * Draw semi-transparent overlays over the trimmed end-regions.
   * Left overlay: bases [0, trimStart)
   * Right overlay: bases [trimEnd, baseCalls.length)
   */
  private drawTrimOverlays(
    vp: { startSample: number; endSample: number; samplesPerPixel: number },
    width: number,
    height: number,
  ): void {
    const tb = this.trimBoundaries
    if (!tb || !this.trace) return
    const peaks = this.trace.peakPositions
    if (!peaks.length) return

    const sampleToX = (s: number) => (s - vp.startSample) / vp.samplesPerPixel

    // Determine trim fill color: amber-tinted, readable in both light and dark themes.
    const fillColor = 'rgba(160, 100, 30, 0.18)'
    const lineColor = 'rgba(160, 100, 30, 0.55)'

    // Left trimmed region: [0, trimStart)
    if (tb.trimStart > 0) {
      const boundaryPeak = peaks[tb.trimStart]
      if (boundaryPeak !== undefined) {
        const boundX = Math.max(0, Math.min(width, sampleToX(boundaryPeak)))
        if (boundX > 0) {
          this.ctx.fillStyle = fillColor
          this.ctx.fillRect(0, 0, boundX, height)
          // Vertical dashed boundary line
          this.ctx.save()
          this.ctx.strokeStyle = lineColor
          this.ctx.lineWidth = 1.5
          this.ctx.setLineDash([4, 4])
          this.ctx.beginPath()
          this.ctx.moveTo(boundX, 0)
          this.ctx.lineTo(boundX, height)
          this.ctx.stroke()
          this.ctx.restore()
        }
      }
    }

    // Right trimmed region: [trimEnd, n)
    if (tb.trimEnd < peaks.length) {
      const boundaryPeak = peaks[tb.trimEnd]
      if (boundaryPeak !== undefined) {
        const boundX = Math.max(0, Math.min(width, sampleToX(boundaryPeak)))
        if (boundX < width) {
          this.ctx.fillStyle = fillColor
          this.ctx.fillRect(boundX, 0, width - boundX, height)
          // Vertical dashed boundary line
          this.ctx.save()
          this.ctx.strokeStyle = lineColor
          this.ctx.lineWidth = 1.5
          this.ctx.setLineDash([4, 4])
          this.ctx.beginPath()
          this.ctx.moveTo(boundX, 0)
          this.ctx.lineTo(boundX, height)
          this.ctx.stroke()
          this.ctx.restore()
        }
      }
    }
  }
}
