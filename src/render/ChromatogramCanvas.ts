import { TRACE_COLORS } from './colors'
import { clampViewport } from './viewport'
import { decimateSamples } from './decimation'
import type { BaseHoverInfo, TrimBoundaries, TraceData } from '../types/trace'
import type { SubsequenceMatch } from '../search/findSubsequence'

export class ChromatogramCanvas {
  private ctx: CanvasRenderingContext2D
  private trace: TraceData | null = null
  private startSample = 0
  private samplesPerPixel = 5
  private raf = 0
  private trimBoundaries: TrimBoundaries | null = null
  private searchMatches: SubsequenceMatch[] = []
  private activeSearchMatchIndex = -1
  private resizeObserver: ResizeObserver | null = null
  private themeMediaQuery: MediaQueryList | null = null
  private themeObserver: MutationObserver | null = null
  private searchHighlightColors = {
    matchColor: 'rgba(59, 130, 246, 0.18)',
    activeFill: 'rgba(245, 158, 11, 0.30)',
    activeStroke: 'rgba(245, 158, 11, 0.85)',
  }

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    this.refreshSearchHighlightColors()
    if (typeof window !== 'undefined') {
      this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.themeMediaQuery.addEventListener('change', this.handleThemeChange)
    }
    if (typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(this.handleThemeMutations)
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'style'],
      })
    }
    // ResizeObserver fires after the element has been laid out in the DOM
    // (and on every subsequent size change), so canvas.clientWidth/Height are
    // valid when resize() runs. Calling resize() directly in the constructor
    // runs before the element is appended to the document — clientWidth would
    // be 0, leaving the physical backing buffer at the Math.max(1,…) minimum
    // of 1×1 px and making every getImageData call return only 1 pixel.
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
  }

  destroy(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.themeObserver?.disconnect()
    this.themeObserver = null
    this.themeMediaQuery?.removeEventListener('change', this.handleThemeChange)
    this.themeMediaQuery = null
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

  setSearchMatches(matches: SubsequenceMatch[], activeIndex: number): void {
    this.searchMatches = matches
    this.activeSearchMatchIndex = activeIndex
    this.canvas.setAttribute('data-search-match-count', String(matches.length))
    this.requestDraw()
  }

  focusBaseRange(startIndex: number, endIndex: number): void {
    if (!this.trace || this.trace.peakPositions.length === 0) return
    const width = Math.max(1, this.canvas.clientWidth || 1)
    const lastBaseIndex = this.trace.peakPositions.length - 1
    const clampedStart = Math.max(0, Math.min(startIndex, lastBaseIndex))
    const clampedEnd = Math.max(clampedStart, Math.min(Math.max(clampedStart, endIndex - 1), lastBaseIndex))
    const leftIndex = Math.max(0, clampedStart - 20)
    const rightIndex = Math.min(lastBaseIndex, clampedEnd + 20)
    const leftSample = this.trace.peakPositions[leftIndex] ?? 0
    const rightSample = this.trace.peakPositions[rightIndex] ?? leftSample
    const visibleSamples = Math.max(160, (rightSample - leftSample) * 1.25)
    const centerSample = ((this.trace.peakPositions[clampedStart] ?? 0) + (this.trace.peakPositions[clampedEnd] ?? 0)) / 2
    this.samplesPerPixel = Math.max(0.5, visibleSamples / width)
    this.startSample = centerSample - (width * this.samplesPerPixel) / 2
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
    const peakPos = this.trace.peakPositions[bestIndex] ?? 0
    return {
      index: bestIndex,
      base: this.trace.baseCalls[bestIndex] ?? 'N',
      samplePosition: peakPos,
      quality: this.trace.qualities?.[bestIndex] ?? null,
      amplitudes: {
        A: Math.round(this.trace.channels.A[peakPos] ?? 0),
        C: Math.round(this.trace.channels.C[peakPos] ?? 0),
        G: Math.round(this.trace.channels.G[peakPos] ?? 0),
        T: Math.round(this.trace.channels.T[peakPos] ?? 0),
      },
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

  private handleThemeChange = (): void => {
    this.refreshSearchHighlightColors()
    this.requestDraw()
  }

  private handleThemeMutations = (mutations: MutationRecord[]): void => {
    if (mutations.length > 0) {
      this.handleThemeChange()
    }
  }

  private refreshSearchHighlightColors(): void {
    if (typeof document === 'undefined') return
    const cssVars = getComputedStyle(document.documentElement)
    this.searchHighlightColors = {
      matchColor: cssVars.getPropertyValue('--color-search-match-bg').trim() || this.searchHighlightColors.matchColor,
      activeFill: cssVars.getPropertyValue('--color-search-canvas-active-fill').trim() || this.searchHighlightColors.activeFill,
      activeStroke: cssVars.getPropertyValue('--color-search-canvas-active-stroke').trim() || this.searchHighlightColors.activeStroke,
    }
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
    this.drawSearchHighlights(vp, width, height)

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

  private drawSearchHighlights(
    vp: { startSample: number; endSample: number; samplesPerPixel: number },
    width: number,
    height: number,
  ): void {
    if (!this.trace || this.searchMatches.length === 0) {
      this.canvas.setAttribute('data-search-visible-count', '0')
      this.canvas.removeAttribute('data-search-active-range')
      return
    }

    const peaks = this.trace.peakPositions
    const activeMatch = this.activeSearchMatchIndex >= 0 ? this.searchMatches[this.activeSearchMatchIndex] ?? null : null
    const sampleToX = (sample: number) => (sample - vp.startSample) / vp.samplesPerPixel
    let visibleCount = 0

    for (const match of this.searchMatches) {
      if (match.start >= peaks.length || match.end <= 0) continue
      const firstPeak = peaks[match.start]
      const lastPeak = peaks[Math.max(match.start, match.end - 1)]
      if (firstPeak === undefined || lastPeak === undefined) continue

      const xStart = sampleToX(firstPeak) - 5
      const xEnd = sampleToX(lastPeak) + 5
      if (xEnd < 0 || xStart > width) continue

      visibleCount += 1
      const isActive = activeMatch === match
      this.ctx.fillStyle = isActive ? this.searchHighlightColors.activeFill : this.searchHighlightColors.matchColor
      this.ctx.fillRect(Math.max(0, xStart), 0, Math.max(3, Math.min(width, xEnd) - Math.max(0, xStart)), height)
      if (isActive) {
        this.ctx.save()
        this.ctx.strokeStyle = this.searchHighlightColors.activeStroke
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(Math.max(0, xStart), 1, Math.max(3, Math.min(width, xEnd) - Math.max(0, xStart)), Math.max(0, height - 2))
        this.ctx.restore()
      }
    }

    this.canvas.setAttribute('data-search-visible-count', String(visibleCount))
    if (activeMatch) {
      this.canvas.setAttribute('data-search-active-range', `${activeMatch.start}:${activeMatch.end}`)
    } else {
      this.canvas.removeAttribute('data-search-active-range')
    }
  }
}
