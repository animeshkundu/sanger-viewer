import { computeQualityBars, MAX_QUALITY_BAR_HEIGHT } from '../quality/qualityBars'
import type { TrimResult } from '../quality/mottTrim'
import type { TraceData } from '../types/trace'

const TRACK_HEIGHT = 56
const BAR_WIDTH = 3

type QualityTrackModel = {
  trace: TraceData
  startSample: number
  samplesPerPixel: number
  trim: TrimResult | null
  mode: 'full' | 'trimmed'
}

export interface QualityTrackHandle {
  element: HTMLElement
  render: (model: QualityTrackModel | null) => void
  clear: () => void
  destroy: () => void
}

export function createQualityTrack(): QualityTrackHandle {
  const root = document.createElement('section')
  root.className = 'quality-track'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Per-base quality track')
  root.setAttribute('data-testid', 'quality-track')

  const header = document.createElement('div')
  header.className = 'quality-track__header'
  const title = document.createElement('h2')
  title.className = 'quality-track__title'
  title.textContent = 'Quality track'
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'quality-track__toggle'
  toggle.setAttribute('data-action', 'toggle-quality-track')
  toggle.setAttribute('aria-pressed', 'true')
  toggle.textContent = 'Hide quality track'
  header.append(title, toggle)

  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'quality-track__canvas-wrap'
  const canvas = document.createElement('canvas')
  canvas.className = 'quality-track__canvas'
  canvas.height = TRACK_HEIGHT
  canvas.setAttribute('aria-label', 'Per-base quality bars')
  canvas.setAttribute('data-testid', 'quality-track-canvas')
  canvasWrap.append(canvas)
  root.append(header, canvasWrap)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  let visible = true
  let lastModel: QualityTrackModel | null = null
  let themeMediaQuery: MediaQueryList | null = null
  let themeObserver: MutationObserver | null = null
  const setVisible = (next: boolean) => {
    visible = next
    root.setAttribute('data-visible', String(visible))
    toggle.setAttribute('aria-pressed', String(visible))
    toggle.textContent = visible ? 'Hide quality track' : 'Show quality track'
    canvasWrap.classList.toggle('hidden', !visible)
  }

  const resizeCanvas = () => {
    const width = Math.max(1, canvasWrap.clientWidth)
    const height = TRACK_HEIGHT
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width, height }
  }

  const draw = (model: QualityTrackModel | null) => {
    const { width, height } = resizeCanvas()
    ctx.clearRect(0, 0, width, height)
    canvas.setAttribute('data-bar-count', '0')
    if (!visible || !model) return

    const { trace, startSample, samplesPerPixel, trim, mode } = model
    const trimStart = mode === 'trimmed' && trim?.status === 'ok' ? trim.trimStart : 0
    const trimEnd = mode === 'trimmed' && trim?.status === 'ok' ? trim.trimEnd : trace.baseCalls.length
    const bars = computeQualityBars(
      trace.qualities,
      trace.peakPositions,
      startSample,
      samplesPerPixel,
      width,
      trimStart,
      trimEnd,
    )
    canvas.setAttribute('data-bar-count', String(bars.length))
    canvas.setAttribute('data-track-height', String(MAX_QUALITY_BAR_HEIGHT))

    const barWidth = Math.min(BAR_WIDTH, Math.max(1, width))
    const cssVars = getComputedStyle(document.documentElement)
    for (const bar of bars) {
      const color = cssVars.getPropertyValue(bar.cssVar).trim() || '#94a3b8'
      const centeredX = Math.round(bar.x) - Math.floor(barWidth / 2)
      const x = Math.max(0, Math.min(width - barWidth, centeredX))
      const y = height - bar.height
      ctx.fillStyle = color
      ctx.fillRect(x, y, barWidth, bar.height)
    }
  }

  toggle.addEventListener('click', () => {
    setVisible(!visible)
    draw(lastModel)
  })

  const render = (model: QualityTrackModel | null) => {
    lastModel = model
    draw(model)
  }

  const clear = () => {
    lastModel = null
    draw(null)
  }

  const handleThemeChange = () => {
    draw(lastModel)
  }

  if (typeof window !== 'undefined') {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    themeMediaQuery.addEventListener('change', handleThemeChange)
  }
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver((mutations) => {
      const shouldRedraw = mutations.some(
        (mutation) =>
          mutation.type === 'attributes'
          && (mutation.attributeName === 'class'
            || mutation.attributeName === 'data-theme'
            || mutation.attributeName === 'style'),
      )
      if (shouldRedraw) handleThemeChange()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })
  }

  const destroy = () => {
    themeObserver?.disconnect()
    themeObserver = null
    themeMediaQuery?.removeEventListener('change', handleThemeChange)
    themeMediaQuery = null
  }

  setVisible(true)
  clear()
  return { element: root, render, clear, destroy }
}
