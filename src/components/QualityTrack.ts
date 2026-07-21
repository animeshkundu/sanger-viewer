import { computeQualityBars, MAX_QUALITY_BAR_HEIGHT } from '../quality/qualityBars'
import {
  computeQualityHeatmapCells,
  computeQualityHeatmapRuns,
  findQualityHeatmapCell,
} from '../quality/qualityHeatmap'
import type { QualityHeatmapCell } from '../quality/qualityHeatmap'
import type { TrimResult } from '../quality/mottTrim'
import type { TraceData } from '../types/trace'
import {
  createTooltip,
  hideTooltip,
  showQualityTooltip,
} from './Tooltip'

const TRACK_HEIGHT = 56
const HEATMAP_HEIGHT = 14
const BAR_WIDTH = 3

export function computeBarDrawLeft(x: number, barWidth: number, canvasWidth: number): number {
  const centeredX = Math.round(x) - Math.floor(barWidth / 2)
  return Math.max(0, Math.min(canvasWidth - barWidth, centeredX))
}

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
  setVisible: (next: boolean) => void
  isVisible: () => boolean
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

  const heatmapWrap = document.createElement('div')
  heatmapWrap.className = 'quality-track__heatmap-wrap'
  const heatmapLabel = document.createElement('span')
  heatmapLabel.className = 'quality-track__heatmap-label'
  heatmapLabel.textContent = 'Phred confidence'
  const heatmapCanvas = document.createElement('canvas')
  heatmapCanvas.className = 'quality-track__heatmap'
  heatmapCanvas.height = HEATMAP_HEIGHT
  heatmapCanvas.setAttribute('role', 'img')
  heatmapCanvas.setAttribute('aria-label', 'Phred quality heatmap; hover for exact score')
  heatmapCanvas.setAttribute('data-testid', 'quality-heatmap-canvas')
  heatmapWrap.append(heatmapLabel, heatmapCanvas)

  const heatmapTooltip = createTooltip()
  heatmapTooltip.className = 'quality-track__tooltip hidden'
  heatmapTooltip.setAttribute('role', 'tooltip')
  heatmapTooltip.setAttribute('data-testid', 'quality-heatmap-tooltip')
  root.append(header, canvasWrap, heatmapWrap, heatmapTooltip)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  const heatmapCtx = heatmapCanvas.getContext('2d')
  if (!heatmapCtx) throw new Error('Canvas 2D unavailable')

  let visible = true
  let lastModel: QualityTrackModel | null = null
  let heatmapCells: QualityHeatmapCell[] = []
  let heatmapWidth = 1
  let themeMediaQuery: MediaQueryList | null = null
  let themeObserver: MutationObserver | null = null
  let resizeObserver: ResizeObserver | null = null
  let themeRaf = 0
  const setVisible = (next: boolean) => {
    visible = next
    root.setAttribute('data-visible', String(visible))
    toggle.setAttribute('aria-pressed', String(visible))
    toggle.textContent = visible ? 'Hide quality track' : 'Show quality track'
    canvasWrap.classList.toggle('hidden', !visible)
    heatmapWrap.classList.toggle('hidden', !visible)
    if (!visible) hideTooltip(heatmapTooltip)
  }

  const resizeCanvas = () => {
    const width = Math.max(1, canvasWrap.clientWidth)
    const height = TRACK_HEIGHT
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    heatmapCanvas.width = Math.floor(width * dpr)
    heatmapCanvas.height = Math.floor(HEATMAP_HEIGHT * dpr)
    heatmapCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    heatmapWidth = width
    return { width, height, dpr }
  }

  const draw = (model: QualityTrackModel | null) => {
    const { width, height, dpr } = resizeCanvas()
    ctx.clearRect(0, 0, width, height)
    heatmapCtx.clearRect(0, 0, width, HEATMAP_HEIGHT)
    heatmapCells = []
    canvas.setAttribute('data-bar-count', '0')
    heatmapCanvas.setAttribute('data-cell-count', '0')
    hideTooltip(heatmapTooltip)
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

    const cssVars = getComputedStyle(document.documentElement)
    heatmapCells = computeQualityHeatmapCells(
      trace.qualities,
      trace.peakPositions,
      startSample,
      samplesPerPixel,
      width,
      trimStart,
      trimEnd,
    )
    heatmapCanvas.setAttribute('data-cell-count', String(heatmapCells.length))
    heatmapCanvas.setAttribute('data-track-height', String(HEATMAP_HEIGHT))
    const heatmapRuns = computeQualityHeatmapRuns(heatmapCells, width, dpr)
    for (const cssVar of [
      '--color-qual-excellent',
      '--color-qual-good',
      '--color-qual-fair',
      '--color-qual-poor',
    ] as const) {
      heatmapCtx.beginPath()
      let hasRuns = false
      for (const run of heatmapRuns) {
        if (run.cssVar !== cssVar) continue
        heatmapCtx.rect(run.x, 0, run.width, HEATMAP_HEIGHT)
        hasRuns = true
      }
      if (hasRuns) {
        heatmapCtx.fillStyle = cssVars.getPropertyValue(cssVar).trim() || '#94a3b8'
        heatmapCtx.fill()
      }
    }

    const barWidth = Math.min(BAR_WIDTH, Math.max(1, width))
    for (const bar of bars) {
      const color = cssVars.getPropertyValue(bar.cssVar).trim() || '#94a3b8'
      const x = computeBarDrawLeft(bar.x, barWidth, width)
      const y = height - bar.height
      ctx.fillStyle = color
      ctx.fillRect(x, y, barWidth, bar.height)
    }
  }

  const handleHeatmapPointerMove = (event: PointerEvent) => {
    if (!visible || !lastModel) {
      hideTooltip(heatmapTooltip)
      return
    }
    const rect = heatmapCanvas.getBoundingClientRect()
    if (rect.width <= 0) {
      hideTooltip(heatmapTooltip)
      return
    }
    const localX = (event.clientX - rect.left) * (heatmapWidth / rect.width)
    const cell = findQualityHeatmapCell(heatmapCells, localX)
    if (!cell) {
      hideTooltip(heatmapTooltip)
      return
    }
    showQualityTooltip(heatmapTooltip, cell.baseIndex, cell.score, event.clientX, event.clientY)
  }

  const handleHeatmapPointerLeave = () => {
    hideTooltip(heatmapTooltip)
  }

  heatmapCanvas.addEventListener('pointermove', handleHeatmapPointerMove)
  heatmapCanvas.addEventListener('pointerleave', handleHeatmapPointerLeave)

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
    if (themeRaf) return
    themeRaf = requestAnimationFrame(() => {
      themeRaf = 0
      draw(lastModel)
    })
  }

  if (typeof window !== 'undefined') {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    themeMediaQuery.addEventListener('change', handleThemeChange)
  }
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver((mutations) => {
      if (mutations.length > 0) handleThemeChange()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => draw(lastModel))
    resizeObserver.observe(canvasWrap)
  }

  const destroy = () => {
    if (themeRaf) {
      cancelAnimationFrame(themeRaf)
      themeRaf = 0
    }
    resizeObserver?.disconnect()
    resizeObserver = null
    themeObserver?.disconnect()
    themeObserver = null
    themeMediaQuery?.removeEventListener('change', handleThemeChange)
    themeMediaQuery = null
    heatmapCanvas.removeEventListener('pointermove', handleHeatmapPointerMove)
    heatmapCanvas.removeEventListener('pointerleave', handleHeatmapPointerLeave)
  }

  setVisible(true)
  clear()
  return { element: root, render, clear, setVisible, isVisible: () => visible, destroy }
}
