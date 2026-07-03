import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import {
  createControls,
  setControlsDisabled,
  setSearchEmptyState,
  setSearchNavigationState,
  setSearchSummary,
  setStrandToggleState,
  setTrimSummary,
  setTrimMode
} from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { createMetadataPanel, updateMetadataPanel } from './MetadataPanel'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'
import { reverseComplementTrace } from '../revcomp'
import { mottTrim, DEFAULT_TRIM_SETTINGS } from '../quality/mottTrim'
import {
  findSubsequenceMatches,
  mapCanonicalMatchesToDisplay,
  normalizeSearchQuery,
  type SubsequenceMatch
} from '../search/findSubsequence'
import type { TrimResult, TrimSettings } from '../quality/mottTrim'
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
type SearchState = {
  query: string
  matches: SubsequenceMatch[]
  activeIndex: number
}

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
  const metadataPanel = createMetadataPanel()
  root.append(controls, readout, sequencePanel, metadataPanel, tooltip)

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
  const searchInput = controls.querySelector<HTMLInputElement>('#search-input')!
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
  canvas.style.touchAction = 'none'

  const renderer = new ChromatogramCanvas(canvas)
  const rootDisconnectObserver = new MutationObserver(() => {
    if (!root.isConnected) {
      renderer.destroy()
      rootDisconnectObserver.disconnect()
    }
  })
  queueMicrotask(() => {
    const parent = root.parentElement
    if (parent) rootDisconnectObserver.observe(parent, { childList: true })
  })
  const tapMoveThreshold = 8
  const activePointers = new Map<number, { clientX: number; clientY: number; startX: number; startY: number; moved: boolean }>()
  let lastPinchDistance = 0
  let canvasLeft = 0
  let hadMultiTouchGesture = false
  let selectedBaseIndex: number | null = null
  let hoveredBaseIndex: number | null = null
  let isRevcomp = false
  let rawTrace: TraceData | null = null
  let trimSettings: TrimSettings = { ...DEFAULT_TRIM_SETTINGS }
  let trimResult: TrimResult | null = null
  let trimRaf = 0
  let viewerState: ViewerState = 'empty'
  let searchState: SearchState = { query: '', matches: [], activeIndex: -1 }

  const getDisplaySearchMatches = () =>
    rawTrace ? mapCanonicalMatchesToDisplay(searchState.matches, rawTrace.baseCalls.length, isRevcomp) : []

  const getActiveDisplayMatch = () => {
    const displayMatches = getDisplaySearchMatches()
    return searchState.activeIndex >= 0 ? displayMatches[searchState.activeIndex] ?? null : null
  }

  const syncSearchUi = (recenterActive = false) => {
    const canSearch = viewerState === 'loaded' && rawTrace !== null
    const hasQuery = searchState.query.length > 0
    const hasMatches = searchState.matches.length > 0
    const displayMatches = canSearch ? getDisplaySearchMatches() : []
    const activeDisplayMatch = searchState.activeIndex >= 0 ? displayMatches[searchState.activeIndex] ?? null : null

    searchInput.disabled = !canSearch
    if (searchInput.value !== searchState.query) searchInput.value = searchState.query

    if (!canSearch) {
      setSearchSummary(controls, '')
      setSearchEmptyState(controls, false)
      setSearchNavigationState(controls, { canNavigate: false, canClear: false })
      renderer.setSearchMatches([], -1)
      return
    }

    if (!hasQuery) {
      setSearchSummary(controls, '')
      setSearchEmptyState(controls, false)
    } else if (!hasMatches) {
      setSearchSummary(controls, '0 matches')
      setSearchEmptyState(controls, true)
    } else {
      const count = searchState.matches.length
      setSearchSummary(controls, `${count} match${count === 1 ? '' : 'es'} · ${searchState.activeIndex + 1} of ${count}`)
      setSearchEmptyState(controls, false)
    }

    setSearchNavigationState(controls, {
      canNavigate: hasMatches,
      canClear: hasQuery,
    })
    renderer.setSearchMatches(displayMatches, searchState.activeIndex)

    if (recenterActive && activeDisplayMatch) {
      renderer.focusBaseRange(activeDisplayMatch.start, activeDisplayMatch.end)
      refreshReadout()
    }
  }

  const resetSearchState = () => {
    searchState = { query: '', matches: [], activeIndex: -1 }
    syncSearchUi(false)
  }

  const applySearchQuery = (query: string, recenterActive = true) => {
    const normalizedQuery = normalizeSearchQuery(query)
    const matches = rawTrace && normalizedQuery ? findSubsequenceMatches(rawTrace.sequence, normalizedQuery) : []
    selectedBaseIndex = null
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    searchState = {
      query: normalizedQuery,
      matches,
      activeIndex: matches.length > 0 ? 0 : -1,
    }
    syncSearchUi(recenterActive && matches.length > 0)
    refreshSequence()
  }

  const moveActiveMatch = (direction: -1 | 1) => {
    if (searchState.matches.length === 0) return
    selectedBaseIndex = null
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    searchState = {
      ...searchState,
      activeIndex:
        (searchState.activeIndex + direction + searchState.matches.length) % searchState.matches.length,
    }
    syncSearchUi(true)
    refreshSequence()
  }

  /** Apply (or re-apply) the current strand to the renderer. */
  const applyDisplayTrace = () => {
    if (!rawTrace) return
    const displayTrace = isRevcomp ? reverseComplementTrace(rawTrace) : rawTrace
    renderer.setTrace(displayTrace)
    applyTrim(displayTrace)
    syncSearchUi(false)
    refreshReadout()
  }

  /** Recompute trim for the given (already-displayed) trace and push results to all consumers. */
  const applyTrim = (displayTrace: TraceData) => {
    const result = mottTrim(displayTrace.qualities, displayTrace.baseCalls, trimSettings.threshold)
    trimResult = result
    // Canvas overlay: only shown in 'trimmed' mode so Full mode gives an unobstructed view.
    const boundaries = (trimSettings.mode === 'trimmed' && result.status === 'ok')
      ? { trimStart: result.trimStart, trimEnd: result.trimEnd }
      : null
    renderer.setTrimBoundaries(boundaries)
    // Update controls summary
    setTrimSummary(controls, result)
    // Re-render sequence panel with new trim info
    refreshSequence()
  }

  /** rAF-throttled trim recompute (for slider drag). */
  const scheduleTrim = () => {
    if (trimRaf) return
    trimRaf = requestAnimationFrame(() => {
      trimRaf = 0
      const trace = renderer.getCurrentTrace()
      if (trace) applyTrim(trace)
    })
  }

  const setState = (state: ViewerState, message = '') => {
    viewerState = state
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
    syncSearchUi(false)
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
    const activeMatch = getActiveDisplayMatch()
    const selectedIndex = hoveredBaseIndex ?? selectedBaseIndex ?? -1
    renderSequence(sequencePanel, trace, {
      selectedIndex,
      anchorIndex: selectedIndex >= 0 ? selectedIndex : activeMatch?.start ?? -1,
      trim: trimResult,
      mode: trimSettings.mode,
      matches: getDisplaySearchMatches(),
      activeMatchIndex: searchState.activeIndex,
    })
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
      resetSearchState()
      setState('loading', `Loading ${file.name}…`)
      const buffer = await file.arrayBuffer()
      const trace = await parseInWorker(buffer, file.name)
      selectedBaseIndex = null
      hoveredBaseIndex = null
      isRevcomp = false
      rawTrace = trace
      setStrandToggleState(controls, false)
      hideTooltip(tooltip)
      updateMetadataPanel(metadataPanel, trace.metadata)
      applyDisplayTrace()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      resetSearchState()
      const msg = error instanceof Error ? error.message : 'Failed to parse file'
      setState('error', msg)
    }
  }

  const loadSample = async () => {
    try {
      resetSearchState()
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
      updateMetadataPanel(metadataPanel, trace.metadata)
      applyDisplayTrace()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      resetSearchState()
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
    const trimMode = target.getAttribute('data-trim-mode') as 'full' | 'trimmed' | null
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
      if (searchState.activeIndex >= 0) {
        syncSearchUi(true)
        refreshSequence()
      } else {
        renderer.fitToScreen()
      }
    }

    if (action === 'export-fasta' && trace) {
      const suffix = [isRevcomp ? '-revcomp' : '', trimSettings.mode === 'trimmed' ? '-trimmed' : ''].filter(Boolean).join('')
      const fasta = new Blob([toFasta(trace, isRevcomp, trimResult, trimSettings.mode)], { type: 'text/plain' })
      downloadBlob(fasta, `${trace.fileName.replace(/\.[^.]+$/, '')}${suffix}.fasta`)
    }

    // Trim mode toggle (Full / Trimmed buttons)
    if (trimMode) {
      trimSettings = { ...trimSettings, mode: trimMode }
      setTrimMode(controls, trimMode)
      const currentTrace = renderer.getCurrentTrace()
      if (currentTrace) applyTrim(currentTrace)
    }

    if (action === 'search-prev') moveActiveMatch(-1)
    if (action === 'search-next') moveActiveMatch(1)
    if (action === 'search-clear') {
      resetSearchState()
      refreshSequence()
    }

    refreshReadout()
  })

  // Threshold slider — rAF-throttled for smoothness on large fixtures.
  controls.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement
    if (target.id === 'search-input') {
      applySearchQuery(target.value)
      return
    }
    if (target.getAttribute('data-trim') !== 'threshold') return
    const value = Number(target.value)
    trimSettings = { ...trimSettings, threshold: value }
    // Update numeric display next to slider
    const display = controls.querySelector<HTMLOutputElement>('#trim-threshold-display')
    if (display) display.value = String(value)
    scheduleTrim()
  })

  controls.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement
    if (target !== searchInput) return
    if (event.key === 'Enter') {
      event.preventDefault()
      moveActiveMatch(event.shiftKey ? -1 : 1)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      resetSearchState()
      refreshSequence()
    }
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

  syncSearchUi(false)
  return root
}
