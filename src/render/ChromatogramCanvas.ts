import { TRACE_COLORS } from './colors'
import { clampViewport } from './viewport'
import type { BaseHoverInfo, TraceData } from '../types/trace'

export class ChromatogramCanvas {
  private ctx: CanvasRenderingContext2D
  private trace: TraceData | null = null
  private startSample = 0
  private samplesPerPixel = 5
  private raf = 0

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    this.resize()
    window.addEventListener('resize', () => this.resize())
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

  getViewportInfo(): { start: number; end: number } {
    if (!this.trace) return { start: 0, end: 0 }
    const vp = clampViewport(this.startSample, this.samplesPerPixel, this.trace.sampleCount, this.canvas.width)
    return { start: Math.round(vp.startSample), end: Math.round(vp.endSample) }
  }

  hitTest(clientX: number): BaseHoverInfo | null {
    if (!this.trace) return null
    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const vp = clampViewport(this.startSample, this.samplesPerPixel, this.trace.sampleCount, this.canvas.width)
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
    let maxY = 1
    ;(['A', 'C', 'G', 'T'] as const).forEach((base) => {
      const values = channels[base]
      for (let i = 0; i < values.length; i += 1) {
        if (values[i] > maxY) maxY = values[i]
      }
    })

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
      let started = false
      const from = Math.max(0, Math.floor(vp.startSample))
      const to = Math.min(data.length - 1, Math.ceil(vp.endSample))
      for (let sample = from; sample <= to; sample += 1) {
        const x = (sample - vp.startSample) / vp.samplesPerPixel
        const y = height * 0.85 - (data[sample] / maxY) * height * 0.7
        if (!started) {
          this.ctx.moveTo(x, y)
          started = true
        } else {
          this.ctx.lineTo(x, y)
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
}
