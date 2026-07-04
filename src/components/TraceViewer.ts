import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import {
  createControls,
  setControlsDisabled,
  setConsensusFastaButtonState,
  setMixedSummary,
  setMixedThresholdDisplay,
  setSearchEmptyState,
  setSearchNavigationState,
  setSearchSummary,
  setStrandToggleState,
  setTrimSummary,
  setTrimMode,
  setUndoRedoState
} from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createBaseInspector, getBaseInspectorInfo, hideBaseInspector, showBaseInspector } from './BaseInspector'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { createMetadataPanel, updateMetadataPanel } from './MetadataPanel'
import { createWorkspaceBar, renderWorkspaceBar } from './WorkspaceBar'
import { createAnnotationTrack } from './AnnotationTrack'
import { createQualityTrack } from './QualityTrack'
import { createConsensusRow, renderConsensusRow, hideConsensusRow } from './ConsensusRow'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'
import { toFastq, toQual } from '../export/fastq'
import { exportSvg } from '../export/svg'
import { computeConsensus, toConsensusFasta } from '../consensus/consensus'
import { reverseComplementTrace, iupacComplement } from '../revcomp'
import { mottTrim, DEFAULT_TRIM_SETTINGS } from '../quality/mottTrim'
import { callMixedBases, DEFAULT_MIXED_BASE_THRESHOLD, type MixedBaseResult } from '../calling/mixedBase'
import {
  findSubsequenceMatches,
  mapCanonicalMatchesToDisplay,
  normalizeSearchQuery,
  type SubsequenceMatch
} from '../search/findSubsequence'
import { TraceWorkspace, makeSlot } from '../workspace/TraceWorkspace'
import { buildAnnotationFeatures, filterAnnotationFeaturesByRange, type AnnotationFeature } from '../annotations'
import { mapSampleViewportToBaseRange } from '../render/viewport'
import { BaseEditModel } from '../editing'
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

const ANNOTATION_VIEWPORT_EXTRA_BASES = 12
const ANNOTATION_FEATURE_PADDING_BASES = 6

export function createTraceViewer(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'viewer'
  root.innerHTML = `
    <h1>Sanger Viewer</h1>

    <!-- Hidden status span kept for test/automation compatibility -->
    <span id="status" class="sr-only">No trace loaded.</span>

    <div class="dropzone" data-testid="dropzone" role="region" aria-label="File upload area">

      <!-- File input always at dropzone level so setInputFiles works in any state -->
      <input type="file" id="file-input" accept=".ab1,.scf" class="sr-only" tabindex="0" />
      <!-- Secondary file input for "Open another" from WorkspaceBar -->
      <input type="file" id="file-input-extra" accept=".ab1,.scf" class="sr-only" tabindex="-1" />

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
  const baseInspector = createBaseInspector()
  const metadataPanel = createMetadataPanel()
  const workspaceBar = createWorkspaceBar()
  const annotationTrack = createAnnotationTrack((feature) => {
    renderer.focusBaseRange(feature.start, feature.end)
    refreshReadout()
  })
  const qualityTrack = createQualityTrack()
  const consensusRow = createConsensusRow()
  const canvasWrap = root.querySelector<HTMLElement>('.canvas-wrap')!
  root.insertBefore(annotationTrack.element, canvasWrap)
  root.append(qualityTrack.element, controls, workspaceBar, readout, sequencePanel, baseInspector, metadataPanel, consensusRow, tooltip)

  const fileInput = root.querySelector<HTMLInputElement>('#file-input')!
  const fileInputExtra = root.querySelector<HTMLInputElement>('#file-input-extra')!
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
  const canvas = root.querySelector<HTMLCanvasElement>('[data-testid="chromatogram-canvas"]')!
  canvas.style.touchAction = 'none'

  const renderer = new ChromatogramCanvas(canvas)
  const rootDisconnectObserver = new MutationObserver(() => {
    if (!root.isConnected) {
      qualityTrack.destroy()
      renderer.destroy()
      document.removeEventListener('keydown', undoRedoKeyHandler)
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
  let mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
  let mixedBaseResult: MixedBaseResult | null = null
  let trimRaf = 0
  let viewerState: ViewerState = 'empty'
  let searchState: SearchState = { query: '', matches: [], activeIndex: -1 }
  let annotationFeatures: AnnotationFeature[] = []
  const workspace = new TraceWorkspace(5)
  let activeSlotId: string | null = null
  const editModel = new BaseEditModel()
  let editingIndex: number = -1  // display index of the span currently in "edit mode" (-1 = none)
  let inspectorDisplayIndex: number | null = null
  let inspectorActiveSpan: HTMLElement | null = null
  setMixedThresholdDisplay(controls, mixedBaseThreshold)
  setMixedSummary(controls, 0)
  setUndoRedoState(controls, false, false)

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

  const buildDisplayTrace = (): TraceData | null => {
    if (!rawTrace) return null
    // Short-circuit when no edits are active to avoid O(n) baseCalls clone/join on
    // every zoom/pan/search/trim recompute.
    let editedRaw: TraceData
    if (editModel.hasEdits) {
      // Apply base edits (forward-strand) before revcomp so all downstream consumers
      // (search, revcomp, mixed-base, FASTA/FASTQ) see the edited sequence.
      const editedBaseCalls = editModel.applyToBaseCalls(rawTrace.baseCalls)
      const editedQualities = editModel.applyToQualities(rawTrace.qualities)
      editedRaw = {
        ...rawTrace,
        baseCalls: editedBaseCalls,
        qualities: editedQualities,
        sequence: editedBaseCalls.join(''),
      }
    } else {
      editedRaw = rawTrace
    }
    const strandTrace = isRevcomp ? reverseComplementTrace(editedRaw) : editedRaw
    mixedBaseResult = callMixedBases(strandTrace, mixedBaseThreshold)

    // Re-pin manually edited positions after mixed-base calling: callMixedBases derives calls
    // from raw signal and can overwrite a manual edit with an IUPAC ambiguity code.
    // The user's explicit edit takes priority over the signal-derived call.
    if (editModel.hasEdits) {
      const pinnedBaseCalls = mixedBaseResult.baseCalls.slice()
      const len = pinnedBaseCalls.length
      const editedDisplayIndices = new Set<number>()
      for (const forwardIdx of editModel.editedIndices) {
        const displayIdx = isRevcomp ? len - 1 - forwardIdx : forwardIdx
        if (displayIdx >= 0 && displayIdx < len) {
          // strandTrace.baseCalls already carries the edited base in display orientation
          // (applied before reverseComplementTrace, so it is correctly complemented).
          pinnedBaseCalls[displayIdx] = strandTrace.baseCalls[displayIdx]
          editedDisplayIndices.add(displayIdx)
        }
      }
      const nonEditedAmbiguousIndices = mixedBaseResult.ambiguousIndices.filter(i => !editedDisplayIndices.has(i))
      mixedBaseResult = {
        baseCalls: pinnedBaseCalls,
        sequence: pinnedBaseCalls.join(''),
        ambiguousIndices: nonEditedAmbiguousIndices,
        ambiguousCount: nonEditedAmbiguousIndices.length,
      }
    }

    setMixedSummary(controls, mixedBaseResult.ambiguousCount)
    annotationFeatures = buildAnnotationFeatures(mixedBaseResult.sequence)
    return {
      ...strandTrace,
      baseCalls: mixedBaseResult.baseCalls,
      sequence: mixedBaseResult.sequence,
    }
  }

  /** Apply (or re-apply) the current strand to the renderer. */
  const applyDisplayTrace = (preserveViewport = false) => {
    const displayTrace = buildDisplayTrace()
    if (!displayTrace) return
    const previousViewport = preserveViewport ? renderer.getViewportState() : null
    renderer.setTrace(displayTrace)
    renderer.setAmbiguousIndices(mixedBaseResult?.ambiguousIndices ?? [])
    if (previousViewport) renderer.setViewportState(previousViewport.startSample, previousViewport.samplesPerPixel)
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
    refreshQualityTrack()
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

  let mixedBaseRaf = 0
  const cancelMixedBaseRecompute = () => {
    if (!mixedBaseRaf) return
    cancelAnimationFrame(mixedBaseRaf)
    mixedBaseRaf = 0
  }
  const scheduleMixedBaseRecompute = () => {
    if (mixedBaseRaf) return
    const scheduledSlotId = activeSlotId
    mixedBaseRaf = requestAnimationFrame(() => {
      mixedBaseRaf = 0
      if (scheduledSlotId !== activeSlotId) return
      applyDisplayTrace(true)
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
    refreshAnnotationTrack()
    refreshQualityTrack()
  }

  const refreshQualityTrack = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) {
      qualityTrack.clear()
      return
    }
    const viewport = renderer.getViewportState()
    qualityTrack.render({
      trace,
      startSample: viewport.startSample,
      samplesPerPixel: viewport.samplesPerPixel,
      trim: trimResult,
      mode: trimSettings.mode,
    })
  }

  const refreshAnnotationTrack = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) {
      annotationTrack.clear()
      return
    }
    const viewportSamples = renderer.getViewportInfo()
    const visibleRange = mapSampleViewportToBaseRange(trace.peakPositions, {
      startSample: viewportSamples.start,
      endSample: viewportSamples.end,
    }, ANNOTATION_VIEWPORT_EXTRA_BASES)
    const visibleFeatures = filterAnnotationFeaturesByRange(
      annotationFeatures,
      visibleRange,
      ANNOTATION_FEATURE_PADDING_BASES,
    )
    annotationTrack.render({
      visibleFeatures,
      visibleRange,
      totalCount: annotationFeatures.length,
    })
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

  const clearBaseInspectorSpanState = () => {
    if (inspectorActiveSpan) {
      inspectorActiveSpan.setAttribute('aria-expanded', 'false')
      inspectorActiveSpan.removeAttribute('aria-describedby')
      inspectorActiveSpan = null
    }
  }

  const closeBaseInspector = () => {
    inspectorDisplayIndex = null
    clearBaseInspectorSpanState()
    hideBaseInspector(baseInspector)
  }

  const syncBaseInspector = () => {
    clearBaseInspectorSpanState()
    const displayIndex = inspectorDisplayIndex
    if (displayIndex === null) {
      hideBaseInspector(baseInspector)
      return
    }
    const trace = renderer.getCurrentTrace()
    if (!trace) {
      closeBaseInspector()
      return
    }
    const info = getBaseInspectorInfo(trace, displayIndex)
    if (!info) {
      closeBaseInspector()
      return
    }
    showBaseInspector(baseInspector, info)
    const activeSpan = sequencePanel.querySelector<HTMLElement>(`span[data-base-index="${displayIndex}"]`)
    if (activeSpan) {
      inspectorActiveSpan = activeSpan
      activeSpan.setAttribute('aria-expanded', 'true')
      activeSpan.setAttribute('aria-describedby', 'base-inspector')
    }
  }

  const openBaseInspector = (displayIndex: number) => {
    inspectorDisplayIndex = displayIndex
    selectedBaseIndex = displayIndex
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    syncBaseInspector()
  }

  const refreshSequence = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) return
    const activeMatch = getActiveDisplayMatch()
    const selectedIndex = inspectorDisplayIndex ?? hoveredBaseIndex ?? selectedBaseIndex ?? -1
    // Map forward-strand edited indices to display-strand coordinates.
    const fwdEdited = editModel.editedIndices
    const displayEdited = fwdEdited.size === 0
      ? fwdEdited
      : new Set(
          [...fwdEdited].map((i) =>
            isRevcomp ? (rawTrace!.baseCalls.length - 1 - i) : i,
          ),
        )
    renderSequence(sequencePanel, trace, {
      selectedIndex,
      anchorIndex: selectedIndex >= 0 ? selectedIndex : activeMatch?.start ?? -1,
      trim: trimResult,
      mode: trimSettings.mode,
      matches: getDisplaySearchMatches(),
      activeMatchIndex: searchState.activeIndex,
      ambiguousIndices: mixedBaseResult?.ambiguousIndices ?? [],
      editedIndices: displayEdited,
      editingIndex,
    })
    syncBaseInspector()
  }

  const inspectBase = (clientX: number, clientY: number, select = false) => {
    // Suppress hover interactions while the keyboard inspector is open so hover
    // pointer events cannot re-render or re-open the tooltip.
    if (!select && inspectorDisplayIndex !== null) {
      hoveredBaseIndex = null
      hideTooltip(tooltip)
      return
    }

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

  /** Push current workspace state to the WorkspaceBar UI. */
  const syncWorkspaceBar = () => {
    renderWorkspaceBar(workspaceBar, workspace.getAll(), activeSlotId)
  }

  /**
   * Recompute and render the consensus row from all resident (non-evicted) slots.
   * Shows the row only when ≥ 2 traces are resident; hides it otherwise.
   * Also manages the enabled/disabled state of the "Export Consensus FASTA" button.
   */
  const refreshConsensus = () => {
    const residentSlots = workspace.getAll().filter((s) => s.rawTrace !== null)
    if (residentSlots.length < 2) {
      hideConsensusRow(consensusRow)
      setConsensusFastaButtonState(controls, false)
      return
    }
    const sequences = residentSlots.map((s) => s.rawTrace!.sequence)
    const fileNames = residentSlots.map((s) => s.fileName)
    const result = computeConsensus(sequences)
    renderConsensusRow(consensusRow, result, fileNames)
    setConsensusFastaButtonState(controls, result.length > 0)
  }

  /**
   * Save the currently active slot's per-slot state back into the workspace
   * so it is correctly restored when switching back later.
   */
  const saveCurrentSlot = () => {
    if (!activeSlotId) return
    workspace.updateSlot(activeSlotId, {
      rawTrace,
      isRevcomp,
      trimSettings: { ...trimSettings },
      trimResult,
      searchState: { ...searchState },
      mixedBaseThreshold,
      mixedBaseResult,
      viewport: renderer.getViewportState(),
    })
  }

  const makeActiveSlot = (trace: TraceData) => {
    const slot = makeSlot(trace)
    slot.viewport = renderer.getViewportState()
    slot.mixedBaseThreshold = mixedBaseThreshold
    slot.mixedBaseResult = mixedBaseResult
    return slot
  }

  const clearRenderPanels = () => {
    renderer.clearTrace()
    annotationFeatures = []
    annotationTrack.clear()
    qualityTrack.clear()
    readout.textContent = 'Position: -'
    sequencePanel.textContent = 'Load a trace to inspect sequence'
  }

  const clearDisplayedTrace = () => {
    cancelMixedBaseRecompute()
    rawTrace = null
    isRevcomp = false
    trimSettings = { ...DEFAULT_TRIM_SETTINGS }
    trimResult = null
    mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
    mixedBaseResult = null
    searchState = { query: '', matches: [], activeIndex: -1 }
    selectedBaseIndex = null
    hoveredBaseIndex = null
    editingIndex = -1
    editModel.reset()
    setUndoRedoState(controls, false, false)
    hideTooltip(tooltip)
    closeBaseInspector()
    setStrandToggleState(controls, false)
    setMixedThresholdDisplay(controls, mixedBaseThreshold)
    setMixedSummary(controls, 0)
    updateMetadataPanel(metadataPanel, null)
    clearRenderPanels()
  }

  syncWorkspaceBar()
  refreshConsensus()

  /**
   * Activate a workspace slot: save the current slot, switch to the new one,
   * and restore all per-slot state (trace, strand, trim, search, viewport).
   */
  const switchToSlot = (id: string, saveOutgoing = true) => {
    cancelMixedBaseRecompute()
    if (saveOutgoing) saveCurrentSlot()
    workspace.activate(id)
    activeSlotId = id
    const slot = workspace.getActive()
    if (!slot) return

    // Restore slot state.
    rawTrace = slot.rawTrace
    isRevcomp = slot.isRevcomp
    trimSettings = { ...slot.trimSettings }
    trimResult = slot.trimResult
    searchState = { ...slot.searchState }
    mixedBaseThreshold = slot.mixedBaseThreshold
    mixedBaseResult = slot.mixedBaseResult

    // Reset interaction state.
    selectedBaseIndex = null
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    setStrandToggleState(controls, isRevcomp)
    setMixedThresholdDisplay(controls, mixedBaseThreshold)
    setMixedSummary(controls, mixedBaseResult?.ambiguousCount ?? 0)

    if (rawTrace) {
      updateMetadataPanel(metadataPanel, rawTrace.metadata)
      applyDisplayTrace()
      renderer.setViewportState(slot.viewport.startSample, slot.viewport.samplesPerPixel)
      refreshReadout()
      const msg = `Loaded ${rawTrace.fileName} (${rawTrace.baseCalls.length} bases)`
      setState('loaded', msg)
    } else {
      // Evicted slot — show the file name but indicate it needs reloading.
      closeBaseInspector()
      updateMetadataPanel(metadataPanel, null)
      clearRenderPanels()
      setState('error', `${slot.fileName} was evicted from memory — please re-open the file`)
    }

    syncWorkspaceBar()
    refreshConsensus()
  }

  const load = async (file: File) => {
    try {
      cancelMixedBaseRecompute()
      saveCurrentSlot()
      setState('loading', `Loading ${file.name}…`)
      const buffer = await file.arrayBuffer()
      const trace = await parseInWorker(buffer, file.name)
      resetSearchState()
      updateMetadataPanel(metadataPanel, null)
      selectedBaseIndex = null
      hoveredBaseIndex = null
      isRevcomp = false
      rawTrace = trace
      trimSettings = { ...DEFAULT_TRIM_SETTINGS }
      trimResult = null
      mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
      mixedBaseResult = null
      searchState = { query: '', matches: [], activeIndex: -1 }
      editingIndex = -1
      editModel.reset()
      setStrandToggleState(controls, false)
      setMixedThresholdDisplay(controls, mixedBaseThreshold)
      setUndoRedoState(controls, false, false)
      hideTooltip(tooltip)
      updateMetadataPanel(metadataPanel, trace.metadata)
      applyDisplayTrace()
      const slot = makeActiveSlot(trace)
      const newId = workspace.add(slot)
      activeSlotId = newId
      syncWorkspaceBar()
      refreshConsensus()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      clearDisplayedTrace()
      activeSlotId = null
      syncWorkspaceBar()
      refreshConsensus()
      const msg = error instanceof Error ? error.message : 'Failed to parse file'
      setState('error', msg)
    }
  }

  const loadSample = async () => {
    try {
      cancelMixedBaseRecompute()
      saveCurrentSlot()
      setState('loading', 'Loading sample trace…')
      const sampleBaseUrl = (import.meta.env.BASE_URL as string).replace(/\/?$/, '/')
      const sampleUrl = `${sampleBaseUrl}sample.ab1`
      const response = await fetch(sampleUrl)
      if (!response.ok) throw new Error(`Could not fetch sample (${response.status})`)
      const buffer = await response.arrayBuffer()
      const trace = await parseInWorker(buffer, 'sample.ab1')
      resetSearchState()
      updateMetadataPanel(metadataPanel, null)
      selectedBaseIndex = null
      hoveredBaseIndex = null
      isRevcomp = false
      rawTrace = trace
      trimSettings = { ...DEFAULT_TRIM_SETTINGS }
      trimResult = null
      mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
      mixedBaseResult = null
      searchState = { query: '', matches: [], activeIndex: -1 }
      editingIndex = -1
      editModel.reset()
      setStrandToggleState(controls, false)
      setMixedThresholdDisplay(controls, mixedBaseThreshold)
      setUndoRedoState(controls, false, false)
      hideTooltip(tooltip)
      updateMetadataPanel(metadataPanel, trace.metadata)
      applyDisplayTrace()
      const slot = makeActiveSlot(trace)
      const newId = workspace.add(slot)
      activeSlotId = newId
      syncWorkspaceBar()
      refreshConsensus()
      const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
      setState('loaded', msg)
    } catch (error) {
      clearDisplayedTrace()
      activeSlotId = null
      syncWorkspaceBar()
      refreshConsensus()
      const msg = error instanceof Error ? error.message : 'Failed to load sample'
      setState('error', msg)
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) void load(file)
  })

  fileInputExtra.addEventListener('change', () => {
    const file = fileInputExtra.files?.[0]
    if (file) void load(file)
    // Reset so the same file can be re-opened if desired.
    fileInputExtra.value = ''
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

  // ── Workspace events ─────────────────────────────────────────────────────────
  root.addEventListener('workspace-switch', (event) => {
    const { id } = (event as CustomEvent<{ id: string }>).detail
    if (id !== activeSlotId) switchToSlot(id)
  })

  root.addEventListener('workspace-close', (event) => {
    const { id } = (event as CustomEvent<{ id: string }>).detail
    const wasActive = id === activeSlotId
    if (wasActive) saveCurrentSlot()
    workspace.close(id)
    if (wasActive) {
      const next = workspace.getActive()
      if (next) {
        switchToSlot(next.id, false)
      } else {
        // No slots left → go back to empty state.
        activeSlotId = null
        clearDisplayedTrace()
        setState('empty')
        syncWorkspaceBar()
        refreshConsensus()
      }
    } else {
      syncWorkspaceBar()
      refreshConsensus()
    }
  })

  root.addEventListener('workspace-open', () => {
    fileInputExtra.click()
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
    if (action === 'export-svg' && rawTrace) {
      const vp = renderer.getViewportState()
      // Use the renderer's current trace (which already has edits + revcomp applied)
      // so SVG exports are consistent with FASTA/FASTQ/canvas output.
      const displayTrace = trace ?? (isRevcomp ? reverseComplementTrace(rawTrace) : rawTrace)
      const vWidth = canvas.clientWidth || 1200
      const vHeight = canvas.clientHeight || 400
      const svg = exportSvg(displayTrace, {
        width: vWidth * 2,
        height: vHeight * 2,
        startSample: vp.startSample,
        endSample: Math.min(
          vp.startSample + vWidth * vp.samplesPerPixel,
          displayTrace.sampleCount - 1
        ),
      })
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const suffix = isRevcomp ? '-revcomp' : ''
      downloadBlob(blob, `${displayTrace.fileName.replace(/\.[^.]+$/, '')}${suffix}-view.svg`)
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

    if (action === 'export-fastq' && trace) {
      const suffix = [isRevcomp ? '-revcomp' : '', trimSettings.mode === 'trimmed' ? '-trimmed' : ''].filter(Boolean).join('')
      const fastq = new Blob([toFastq(trace, isRevcomp, trimResult, trimSettings.mode)], { type: 'text/plain' })
      downloadBlob(fastq, `${trace.fileName.replace(/\.[^.]+$/, '')}${suffix}.fastq`)
    }

    if (action === 'export-qual' && trace) {
      const suffix = [isRevcomp ? '-revcomp' : '', trimSettings.mode === 'trimmed' ? '-trimmed' : ''].filter(Boolean).join('')
      const qual = new Blob([toQual(trace, isRevcomp, trimResult, trimSettings.mode)], { type: 'text/plain' })
      downloadBlob(qual, `${trace.fileName.replace(/\.[^.]+$/, '')}${suffix}.qual`)
    }

    if (action === 'export-consensus-fasta') {
      const residentSlots = workspace.getAll().filter((s) => s.rawTrace !== null)
      if (residentSlots.length >= 2) {
        const sequences = residentSlots.map((s) => s.rawTrace!.sequence)
        const fileNames = residentSlots.map((s) => s.fileName)
        const result = computeConsensus(sequences)
        const fasta = toConsensusFasta(result, fileNames)
        downloadBlob(new Blob([fasta], { type: 'text/plain' }), 'consensus.fasta')
      }
    }

    if (action === 'undo' && rawTrace) {
      editModel.undo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
      refreshSequence()
    }

    if (action === 'redo' && rawTrace) {
      editModel.redo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
      refreshSequence()
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
    if (target.getAttribute('data-mixed') === 'threshold') {
      const value = Number(target.value)
      mixedBaseThreshold = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_MIXED_BASE_THRESHOLD
      setMixedThresholdDisplay(controls, mixedBaseThreshold)
      scheduleMixedBaseRecompute()
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
    // Suppress refreshSequence while the keyboard inspector is open — the same
    // guard used in inspectBase.  Chrome fires a synthetic pointerleave when
    // programmatic element.focus() shifts keyboard focus away from the canvas,
    // which would cause panel.innerHTML='' to destroy the focused span and
    // trigger a focusout that closes the inspector.
    if (inspectorDisplayIndex === null) {
      refreshSequence()
    }
  })

  // ── Sequence panel editing ────────────────────────────────────────────────

  /** Valid IUPAC base characters (uppercase). */
  const IUPAC_BASES = new Set('ACGTNRYSWKMBVDH')

  /**
   * Convert a display-strand index to a forward-strand index.
   * When isRevcomp is true the display order is reversed relative to the raw trace.
   */
  const displayToForwardIndex = (displayIdx: number): number => {
    if (!rawTrace) return displayIdx
    return isRevcomp ? rawTrace.baseCalls.length - 1 - displayIdx : displayIdx
  }

  /**
   * Directly update the CSS class of a span to show/hide the editing highlight.
   * This mutates the existing DOM node (no full re-render) so focus is preserved.
   */
  const setSpanEditingClass = (displayIdx: number, active: boolean) => {
    sequencePanel.querySelectorAll<HTMLElement>('.editing').forEach((el) => el.classList.remove('editing'))
    if (active) {
      const span = sequencePanel.querySelector<HTMLElement>(`[data-base-index="${displayIdx}"]`)
      span?.classList.add('editing')
    }
  }

  /**
   * Apply an edit at the given display index.
   * Handles coordinate mapping for revcomp and commits to the edit model.
   * A full re-render is triggered AFTER the edit so the span reflects the new base
   * and .edited-base class; focus is moved to the updated span.
   */
  const applyBaseEdit = (displayIdx: number, newBase: string) => {
    if (!rawTrace) return
    const forwardIdx = displayToForwardIndex(displayIdx)
    const originalBase = rawTrace.baseCalls[forwardIdx]
    if (originalBase === undefined) return
    // On revcomp strand the stored base is complemented so it reads correctly forward.
    const storedBase = isRevcomp ? iupacComplement(newBase) : newBase
    editModel.apply(forwardIdx, storedBase, originalBase)
    setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
    editingIndex = -1
    applyDisplayTrace(true)
    refreshSequence()
    // Refocus the span at the same display index after re-render.
    const updatedSpan = sequencePanel.querySelector<HTMLElement>(`[data-base-index="${displayIdx}"]`)
    updatedSpan?.focus()
  }

  // Double-click on a base span → enter editing mode for that position.
  // (Keyboard Enter/Space is reserved for the base inspector path.)
  // We do NOT call refreshSequence() here: instead we update the span's CSS class
  // directly on the existing DOM node so the focused element stays in the DOM and
  // subsequent keyboard events are captured by our delegated keydown handler.
  sequencePanel.addEventListener('dblclick', (event) => {
    if (!rawTrace) return
    const target = event.target as HTMLElement
    const idxStr = target.dataset.baseIndex
    if (idxStr === undefined) return
    editingIndex = Number(idxStr)
    setSpanEditingClass(editingIndex, true)
    target.focus()
  })

  sequencePanel.addEventListener('focusin', (event) => {
    if (!rawTrace) return
    const target = event.target as HTMLElement
    const idxStr = target.dataset.baseIndex
    if (idxStr === undefined) return
    openBaseInspector(Number(idxStr))
  })

  // Keyboard: Enter or Space on a focused span opens the base inspector.
  sequencePanel.addEventListener('keydown', (event) => {
    if (!rawTrace) return
    const target = event.target as HTMLElement
    const idxStr = target.dataset.baseIndex
    if (idxStr === undefined) return
    const displayIdx = Number(idxStr)

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openBaseInspector(displayIdx)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeBaseInspector()
      editingIndex = -1
      setSpanEditingClass(-1, false)
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      // Revert the base to its original (raw trace) value.
      const forwardIdx = displayToForwardIndex(displayIdx)
      const originalBase = rawTrace.baseCalls[forwardIdx]
      if (originalBase !== undefined) {
        editModel.apply(forwardIdx, originalBase, originalBase)
        setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
        editingIndex = -1
        applyDisplayTrace(true)
        refreshSequence()
        const refreshedSpan = sequencePanel.querySelector<HTMLElement>(`[data-base-index="${displayIdx}"]`)
        refreshedSpan?.focus()
      }
      return
    }

    // Single character: apply edit only when explicitly in edit mode for this span.
    if (editingIndex === displayIdx && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const upper = event.key.toUpperCase()
      if (IUPAC_BASES.has(upper)) {
        event.preventDefault()
        applyBaseEdit(displayIdx, upper)
      }
    }
  })

  // Cancel editing mode when focus leaves the sequence panel entirely.
  sequencePanel.addEventListener('focusout', (event) => {
    const related = (event as FocusEvent).relatedTarget as Node | null
    if (!sequencePanel.contains(related)) {
      closeBaseInspector()
      editingIndex = -1
      // Remove editing highlight from the current span without a full re-render.
      setSpanEditingClass(-1, false)
    }
  })

  // Global keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo).
  // Registered on document (not root) so the shortcuts work even after a refreshSequence()
  // call returns focus to body (e.g. after undoing an edit while focus was on a span).
  const undoRedoKeyHandler = (event: KeyboardEvent) => {
    if (!rawTrace) return
    // KeyboardEvent.target is EventTarget | null; guard before accessing element properties.
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    // Do not intercept inside text inputs such as the search box.
    if (target === searchInput || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      if (!editModel.canUndo) return
      event.preventDefault()
      editModel.undo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
      refreshSequence()
    } else if ((event.ctrlKey || event.metaKey) && ((key === 'z' && event.shiftKey) || key === 'y')) {
      if (!editModel.canRedo) return
      event.preventDefault()
      editModel.redo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
      refreshSequence()
    }
  }
  document.addEventListener('keydown', undoRedoKeyHandler)

  syncSearchUi(false)
  return root
}
