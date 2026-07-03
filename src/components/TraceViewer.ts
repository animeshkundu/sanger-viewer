import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import { createControls, setControlsDisabled, setStrandToggleState } from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'
import { reverseComplementTrace } from '../revcomp'
import type { TraceData } from '../types/trace'

// Lazily-loaded worker module (Vite ?worker import, only in browser bundles).
type WorkerConstructor = new () => Worker
let WorkerCtor: WorkerConstructor | null = null
async function getWorkerCtor(): Promise<WorkerConstructor> {
  if (!WorkerCtor) {
    const mod = await import('../workers/parser.worker?worker')
    WorkerCtor = mod.default as WorkerConstructor
  }
  return WorkerCtor
}

/** Parse a trace file in a dedicated Worker, transferring the buffer. */
function parseInWorker(buffer: ArrayBuffer, fileName: string): Promise<TraceData> {
  return getWorkerCtor().then(
    (Ctor) =>
      new Promise<TraceData>((resolve, reject) => {
        const worker = new Ctor()
        worker.onmessage = (event: MessageEvent<{ ok: boolean; trace?: TraceData; error?: string }>) => {
          worker.terminate()
          if (event.data.ok && event.data.trace) {
            resolve(event.data.trace)
          } else {
            reject(new Error(event.data.error ?? 'Parse error'))
          }
        }
        worker.onerror = (err: ErrorEvent) => {
          worker.terminate()
          reject(new Error(err.message))
        }
        worker.postMessage({ buffer, fileName }, [buffer])
      })
  )
}

type ViewerState = 'empty' | 'loading' | 'loaded' | 'error'

export function createTraceViewer(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'viewer'
  root.innerHTML = `
    <h1>Sanger Viewer</h1>

    <!-- Hidden status span kept for test/automation compatibility -->
    <span id="status" class="sr-only">No trace loaded.</span>

    <div class="dropzone" data-testid="dropzone" role="region" aria-label="File upload area">

      <!-- File input always at dropzone level so setInputFiles works in any state -->
      <input type="file" id="file-input" accept=".ab1,.scf" class="sr-only" />

      <!-- Empty state (shown when no trace is loaded) -->
      <div id="empty-state" class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">🧬</div>
        <h2 class="empty-state__title">Load a Sanger trace</h2>
        <p class="empty-state__body">
          Open an <strong>.ab1</strong> or <strong>.scf</strong> file from your sequencing run,
          or try the built-in sample trace to explore the viewer.
        </p>
        <div class="empty-state__actions">
          <label class="empty-state__file-label" for="file-input">
            📂 Choose file
          </label>
          <button id="sample-load-btn" class="empty-state__sample-btn">
            ✨ Load sample
          </button>
        </div>
        <p class="empty-state__hint">or drag &amp; drop a file anywhere in this area</p>
      </div>

      <!-- Compact header (shown after a trace is loaded) -->
      <div id="dropzone-header" class="dropzone-header hidden">
        <label class="dropzone-header__label" for="file-input">
          📂 Change file
        </label>
        <span class="dropzone-drag-hint" aria-hidden="true">or drag &amp; drop</span>
      </div>

      <!-- Loading banner -->
      <div id="loading-banner" class="status-banner status-banner--loading hidden"
        role="status" aria-live="polite" aria-atomic="true">
        <span class="spinner" aria-hidden="true"></span>
        <span id="loading-text">Loading…</span>
      </div>

      <!-- Error banner -->
      <div id="error-banner" class="status-banner status-banner--error hidden"
        role="alert" aria-live="assertive" aria-atomic="true">
        <span aria-hidden="true">⚠️</span>
        <span id="error-text"></span>
      </div>

      <!-- Success banner (compact, shown below compact header when loaded) -->
      <div id="success-banner" class="status-banner status-banner--success hidden"
        role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">✓</span>
        <span id="success-text"></span>
      </div>

    </div>

    <div class="canvas-wrap">
      <canvas data-testid="chromatogram-canvas" aria-label="Chromatogram trace canvas"></canvas>
    </div>
  `

  const controls = createControls()
  const sequencePanel = createSequencePanel()
  const readout = createPositionReadout()
  const tooltip = createTooltip()
  root.append(controls, readout, sequencePanel, tooltip)

  const fileInput = root.querySelector<HTMLInputElement>('#file-input')!
  const status = root.querySelector<HTMLElement>('#status')!
  const dropzone = root.querySelector<HTMLElement>('.dropzone')!
  const emptyStateEl = root.querySelector<HTMLElement>('#empty-state')!
  const dropzoneHeader = root.querySelector<HTMLElement>('#dropzone-header')!
  const loadingBanner = root.querySelector<HTMLElement>('#loading-banner')!
  const loadingText = root.querySelector<HTMLElement>('#loading-text')!
  const errorBanner = root.querySelector<HTMLElement>('#error-banner')!
  const errorText = root.querySelector<HTMLElement>('#error-text')!
  const successBanner = root.querySelector<HTMLElement>('#success-banner')!
  const successText = root.querySelector<HTMLElement>('#success-text')!
  const sampleBtn = root.querySelector<HTMLButtonElement>('#sample-load-btn')!
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
  canvas.style.touchAction = 'none'

  const renderer = new ChromatogramCanvas(canvas)
  const tapMoveThreshold = 8
  const activePointers = new Map<number, { clientX: number; clientY: number; startX: number; startY: number; moved: boolean }>()
  let lastPinchDistance = 0
  let canvasLeft = 0
  let hadMultiTouchGesture = false
  let selectedBaseIndex: number | null = null
  let hoveredBaseIndex: number | null = null
  let isRevcomp = false
  let rawTrace: TraceData | null = null

  /** Apply (or re-apply) the current strand to the renderer. */
  const applyDisplayTrace = () => {
    if (!rawTrace) return
    const displayTrace = isRevcomp ? reverseComplementTrace(rawTrace) : rawTrace
    renderer.setTrace(displayTrace)
    renderSequence(sequencePanel, displayTrace)
    refreshReadout()
  }

  const setState = (state: ViewerState, message = '') => {
    emptyStateEl.classList.toggle('hidden', state !== 'empty')
    dropzoneHeader.classList.toggle('hidden', state === 'empty')
    loadingBanner.classList.toggle('hidden', state !== 'loading')
    errorBanner.classList.toggle('hidden', state !== 'error')
    successBanner.classList.toggle('hidden', state !== 'loaded')

    if (state === 'loading') {
      loadingText.textContent = message || 'Loading…'
      status.textContent = message || 'Loading…'
      setControlsDisabled(controls, true)
    } else if (state === 'error') {
      errorText.textContent = message
      status.textContent = message
      setControlsDisabled(controls, false)
    } else if (state === 'loaded') {
      successText.textContent = message
      status.textContent = message
      setControlsDisabled(controls, false)
    } else {
      status.textContent = 'No trace loaded.'
      setControlsDisabled(controls, false)
    }
  }

  const refreshReadout = () => {
    const vp = renderer.getViewportInfo()
    updatePositionReadout(readout, vp.start, vp.end)
  }

  // rAF-throttled variant — use this in high-frequency event handlers (wheel,
  // pointermove) to avoid synchronous DOM writes at pointer-event rate.
  let readoutRaf = 0
  const scheduleReadout = () => {
    if (readoutRaf) return
    readoutRaf = requestAnimationFrame(() => {
      readoutRaf = 0
      refreshReadout()
    })
  }

  const refreshSequence = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) return
    renderSequence(sequencePanel, trace, hoveredBaseIndex ?? selectedBaseIndex ?? -1)
  }

  const inspectBase = (clientX: number, clientY: number, select = false) => {
    const hit = renderer.hitTest(clientX)
    if (!hit) {
      if (!select) {
        hoveredBaseIndex = null
        hideTooltip(tooltip)
        refreshSequence()
      }
      return
    }

    showTooltip(tooltip, hit, clientX, clientY)
    if (select) {
      selectedBaseIndex = hit.index
      hoveredBaseIndex = null
    } else {
      hoveredBaseIndex = hit.index
    }
    refreshSequence()
  }

  const getPointerDistance = () => {
    const [first, second] = [...activePointers.values()]
    if (!first || !second) return 0
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
  }

  const releasePointer = (pointerId: number) => {
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId)
  }

  const cacheCanvasOffset = () => {
    canvasLeft = canvas.getBoundingClientRect().left
  }

  const load = async (file: File) => {
    try {
      setState('loading', `Loading ${file.name}…`)
      const buffer = await file.arrayBuffer()
      const trace = await parseInWorker(buffer, file.name)
      selectedBaseIndex = null
      hoveredBaseIndex = null
      isRevcomp = false
      rawTrace = trace
      setStrandToggleState(controls, false)
      hideTooltip(tooltip)
      applyDisplayTrace()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to parse file'
      setState('error', msg)
    }
  }

  const loadSample = async () => {
    try {
      setState('loading', 'Loading sample trace…')
      const sampleBaseUrl = (import.meta.env.BASE_URL as string).replace(/\/?$/, '/')
      const sampleUrl = `${sampleBaseUrl}sample.ab1`
      const response = await fetch(sampleUrl)
      if (!response.ok) throw new Error(`Could not fetch sample (${response.status})`)
      const buffer = await response.arrayBuffer()
      const trace = await parseInWorker(buffer, 'sample.ab1')
      selectedBaseIndex = null
      hoveredBaseIndex = null
      isRevcomp = false
      rawTrace = trace
      setStrandToggleState(controls, false)
      hideTooltip(tooltip)
      applyDisplayTrace()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load sample'
      setState('error', msg)
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) void load(file)
  })

  sampleBtn.addEventListener('click', () => void loadSample())

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropzone.classList.add('dragging')
  })
  dropzone.addEventListener('dragleave', (event) => {
    // Only remove if leaving the dropzone entirely (not moving between children)
    if (!dropzone.contains(event.relatedTarget as Node | null)) {
      dropzone.classList.remove('dragging')
    }
  })
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropzone.classList.remove('dragging')
    const file = event.dataTransfer?.files?.[0]
    if (file) void load(file)
  })

  controls.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement
    const action = target.getAttribute('data-action')
    const trace = renderer.getCurrentTrace()

    if (action === 'zoom-in') renderer.zoom(0.75)
    if (action === 'zoom-out') renderer.zoom(1.25)
    if (action === 'pan-left') renderer.panPixels(-80)
    if (action === 'pan-right') renderer.panPixels(80)
    if (action === 'fit') renderer.fitToScreen()

    if (action === 'export-png') {
      const blob = await renderer.exportPngBlob()
      downloadBlob(blob, `${trace?.fileName ?? 'trace'}-view.png`)
    }
    if (action === 'toggle-strand' && rawTrace) {
      isRevcomp = !isRevcomp
      selectedBaseIndex = null
      hoveredBaseIndex = null
      hideTooltip(tooltip)
      setStrandToggleState(controls, isRevcomp)
      applyDisplayTrace()
      renderer.fitToScreen()
    }

    if (action === 'export-fasta' && trace) {
      const fasta = new Blob([toFasta(trace, isRevcomp)], { type: 'text/plain' })
      downloadBlob(fasta, `${trace.fileName.replace(/\.[^.]+$/, '')}${isRevcomp ? '-revcomp' : ''}.fasta`)
    }
    refreshReadout()
  })

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 0.9 : 1.1
    renderer.zoom(factor, event.offsetX)
    scheduleReadout()
  })

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    if (event.pointerType !== 'mouse') event.preventDefault()
    cacheCanvasOffset()
    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    })
    canvas.setPointerCapture?.(event.pointerId)
    if (activePointers.size > 1) {
      hadMultiTouchGesture = true
      lastPinchDistance = getPointerDistance()
    }
  })

  canvas.addEventListener('pointermove', (event) => {
    const pointer = activePointers.get(event.pointerId)
    if (pointer) {
      if (event.pointerType !== 'mouse') event.preventDefault()
      activePointers.set(event.pointerId, {
        ...pointer,
        clientX: event.clientX,
        clientY: event.clientY,
        moved:
          pointer.moved ||
          Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= tapMoveThreshold
      })

      if (activePointers.size === 1) {
        renderer.panPixels(pointer.clientX - event.clientX)
        scheduleReadout()
        return
      }
      if (activePointers.size === 2) {
        const currentDistance = getPointerDistance()
        const [first, second] = [...activePointers.values()]
        if (!first || !second || currentDistance === 0) return
        const centerX = (first.clientX + second.clientX) / 2 - canvasLeft
        if (lastPinchDistance > 0) {
          renderer.zoom(lastPinchDistance / currentDistance, centerX)
          scheduleReadout()
        }
        lastPinchDistance = currentDistance
        return
      }

      return
    }

    if (event.pointerType === 'mouse') inspectBase(event.clientX, event.clientY)
  })

  const finishPointer = (event: PointerEvent, cancelled = false) => {
    const pointer = activePointers.get(event.pointerId)
    if (!pointer) return
    if (event.pointerType !== 'mouse') event.preventDefault()
    activePointers.delete(event.pointerId)
    releasePointer(event.pointerId)

    if (!cancelled && !hadMultiTouchGesture && !pointer.moved) inspectBase(event.clientX, event.clientY, true)
    if (activePointers.size < 2) lastPinchDistance = 0
    if (activePointers.size === 0) hadMultiTouchGesture = false
  }

  canvas.addEventListener('pointerup', (event) => finishPointer(event))
  canvas.addEventListener('pointercancel', (event) => finishPointer(event, true))
  canvas.addEventListener('lostpointercapture', (event) => {
    activePointers.delete(event.pointerId)
    if (activePointers.size < 2) lastPinchDistance = 0
    if (activePointers.size === 0) hadMultiTouchGesture = false
  })

  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || activePointers.size > 0) return
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    refreshSequence()
  })

  return root
}
