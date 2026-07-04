import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import {
  createControls,
  setControlsDisabled,
  setConsensusFastaButtonState,
  setExportMenuOpen,
  setMixedSummary,
  setMixedThresholdDisplay,
  setSearchEmptyState,
  setSearchNavigationState,
  setSearchSummary,
  setStrandToggleState,
  setTrimSummary,
  setTrimMode,
  setUndoRedoState,
  setPrintButtonState,
  setShareStatus
} from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createBaseInspector, getBaseInspectorInfo, hideBaseInspector, showBaseInspector } from './BaseInspector'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { createMetadataPanel, updateMetadataPanel } from './MetadataPanel'
import { createWorkspaceBar, renderWorkspaceBar } from './WorkspaceBar'
import { createAnnotationTrack } from './AnnotationTrack'
import { createPlasmidMap } from './PlasmidMap'
import { createQualityTrack } from './QualityTrack'
import { createConsensusRow, renderConsensusRow, hideConsensusRow } from './ConsensusRow'
import { createReferencePanel, setReferencePanelStatus, type ReferencePanelElements } from './ReferencePanel'
import { createVariantTable, renderVariantTable, setVariantTableVisible, type VariantTableElements } from './VariantTable'
import {
  createContigPanel,
  setAssembleButtonEnabled,
  renderContigPanel,
  setContigPanelStatus,
  clearContigPanel,
  getAssemblyControls,
  type ContigPanelElements,
} from './ContigPanel'
import {
  createPrimerPanel,
  renderPrimerResults,
  setPrimerPanelStatus,
  clearPrimerPanel,
  type PrimerPanelElements,
} from './PrimerPanel'
import { findPrimerBindingSites } from '../primers/binding'
import { predictAmplicons, ampliconToFasta } from '../primers/pcr'
import type { PrimerEntry } from '../types/primer'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'
import { toFastq, toQual } from '../export/fastq'
import { exportSvg } from '../export/svg'
import { toVariantsCsv, toVariantsVcf } from '../export/variants'
import { computeConsensus, toConsensusFasta } from '../consensus/consensus'
import { toContigFasta } from '../consensus/contig'
import { assembleWithControls } from '../consensus/assemblyControls'
import { buildPrintSection, type PrintSectionData } from '../export/print'
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
import { decodePermalinkState, encodePermalinkState, type PermalinkSource, type PermalinkStateV1 } from '../workspace/permalink'
import { buildAnnotationFeatures, filterAnnotationFeaturesByRange, type AnnotationFeature } from '../annotations'
import { findRestrictionSites, type RestrictionSitePosition } from '../plasmidMap/restriction'
import { mapSampleViewportToBaseRange } from '../render/viewport'
import { BaseEditModel } from '../editing'
import { alignReadToReference, parseFastaSequence } from '../alignment/aligner'
import { callVariants } from '../variants/caller'
import type { VariantFilterMode } from '../variants/filter'
import type { TrimResult, TrimSettings } from '../quality/mottTrim'
import type { TraceData } from '../types/trace'
import type { ReferenceAlignment, CalledVariant } from '../types/alignment'

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
const DEFAULT_ALIGNMENT_BANDWIDTH = 20

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
        <p id="permalink-hint" class="empty-state__hint hidden" role="status" aria-live="polite" aria-atomic="true"></p>
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

    <div id="sample-ribbon" class="status-banner status-banner--sample hidden" role="status" aria-live="polite" aria-atomic="true">
      <span id="sample-ribbon-text">Viewing sample trace — drop your own .ab1/.scf (100% in-browser, nothing uploaded)</span>
      <button id="sample-ribbon-dismiss" type="button" class="status-banner__dismiss" aria-label="Dismiss sample trace notice">Dismiss</button>
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
  const plasmidMap = createPlasmidMap(({ start, end }) => {
    const safeEnd = end > start ? end : start + 1
    renderer.focusBaseRange(start, safeEnd)
    refreshReadout()
    openBaseInspector(start)
    refreshSequence()
  })
  const qualityTrack = createQualityTrack()
  const consensusRow = createConsensusRow()
  const referencePanelElements: ReferencePanelElements = createReferencePanel()
  const variantTableElements: VariantTableElements = createVariantTable()
  const contigPanelElements: ContigPanelElements = createContigPanel()
  const primerPanelElements: PrimerPanelElements = createPrimerPanel()
  const canvasWrap = root.querySelector<HTMLElement>('.canvas-wrap')!
  root.insertBefore(annotationTrack.element, canvasWrap)
  root.append(qualityTrack.element, controls, workspaceBar, plasmidMap.element, readout, sequencePanel, baseInspector, metadataPanel, consensusRow, referencePanelElements.root, variantTableElements.root, contigPanelElements.root, primerPanelElements.root, tooltip)
  setVariantTableVisible(variantTableElements, false)

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
  const permalinkHint = root.querySelector<HTMLElement>('#permalink-hint')!
  const sampleRibbon = root.querySelector<HTMLElement>('#sample-ribbon')!
  const sampleRibbonDismissBtn = root.querySelector<HTMLButtonElement>('#sample-ribbon-dismiss')!
  const searchInput = controls.querySelector<HTMLInputElement>('#search-input')!
  const canvas = root.querySelector<HTMLCanvasElement>('[data-testid="chromatogram-canvas"]')!
  canvas.style.touchAction = 'none'

  const renderer = new ChromatogramCanvas(canvas)
  const rootDisconnectObserver = new MutationObserver(() => {
    if (!root.isConnected) {
      if (permalinkRaf) {
        cancelAnimationFrame(permalinkRaf)
        permalinkRaf = 0
      }
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
  let traceSource: PermalinkSource | null = null
  let trimSettings: TrimSettings = { ...DEFAULT_TRIM_SETTINGS }
  let trimResult: TrimResult | null = null
  let mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
  let mixedBaseResult: MixedBaseResult | null = null
  let trimRaf = 0
  let viewerState: ViewerState = 'empty'
  let searchState: SearchState = { query: '', matches: [], activeIndex: -1 }
  let annotationFeatures: AnnotationFeature[] = []
  let restrictionSites: RestrictionSitePosition[] = []
  const workspace = new TraceWorkspace(5)
  let activeSlotId: string | null = null
  let sampleRibbonDismissed = false
  let loadRequestId = 0
  const editModel = new BaseEditModel()
  const initialPermalink = decodePermalinkState(window.location.hash)
  let pendingPermalink: PermalinkStateV1 | null = initialPermalink
  let permalinkRaf = 0
  let editingIndex: number = -1  // display index of the span currently in "edit mode" (-1 = none)
  let inspectorDisplayIndex: number | null = null
  let inspectorActiveSpan: HTMLElement | null = null
  // ── Reference alignment / variant state ────────────────────────────────────
  let alignmentResult: ReferenceAlignment | null = null
  let referenceSequence: string | null = null
  let referenceId: string | null = null
  let calledVariants: CalledVariant[] = []
  let variantReviews: Record<string, CalledVariant['review']> = {}
  let variantFilterMode: VariantFilterMode = 'all'
  let selectedVariantId: string | null = null
  // ── Contig assembly state ─────────────────────────────────────────────────
  let currentContig: import('../consensus/contig').PairedContig | null = null
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

  const setPermalinkHint = (message: string) => {
    permalinkHint.textContent = message
    permalinkHint.classList.toggle('hidden', message.length === 0)
  }

  const getPermalinkState = (): Omit<PermalinkStateV1, 'version'> | null => {
    if (!rawTrace || !traceSource) return null
    const viewport = renderer.getViewportState()
    return {
      source: traceSource,
      view: viewport,
      strand: isRevcomp ? 'reverse' : 'forward',
      trim: trimSettings,
      search: searchState,
      selection: { baseIndex: inspectorDisplayIndex ?? selectedBaseIndex },
      edits: editModel.toArray(),
      overlays: {
        quality: qualityTrack.isVisible(),
        annotations: true,
        mixedBases: true,
      },
    }
  }

  const persistPermalinkHash = () => {
    const state = getPermalinkState()
    if (!state) return
    const encoded = encodePermalinkState(state, { maxChars: 1800 })
    if (!encoded.hash) return
    history.replaceState(null, '', `${location.pathname}${location.search}${encoded.hash}`)
  }

  const schedulePermalinkPersist = () => {
    if (permalinkRaf) return
    permalinkRaf = requestAnimationFrame(() => {
      permalinkRaf = 0
      persistPermalinkHash()
    })
  }

  const applyPermalinkState = (state: PermalinkStateV1) => {
    if (!rawTrace) return
    isRevcomp = state.strand === 'reverse'
    trimSettings = { ...state.trim }
    setTrimMode(controls, trimSettings.mode)
    const trimSlider = controls.querySelector<HTMLInputElement>('[data-trim="threshold"]')
    if (trimSlider) trimSlider.value = String(trimSettings.threshold)
    const trimOutput = controls.querySelector<HTMLOutputElement>('#trim-threshold-display')
    if (trimOutput) trimOutput.value = String(trimSettings.threshold)
    editModel.replace(state.edits)
    setStrandToggleState(controls, isRevcomp)
    setMixedThresholdDisplay(controls, mixedBaseThreshold)
    setUndoRedoState(controls, false, false)
    qualityTrack.setVisible(state.overlays.quality)
    applyDisplayTrace()
    renderer.setViewportState(state.view.startSample, state.view.samplesPerPixel)
    const normalizedQuery = normalizeSearchQuery(state.search.query)
    const matches = normalizedQuery ? findSubsequenceMatches(rawTrace.sequence, normalizedQuery) : []
    searchState = {
      query: normalizedQuery,
      matches,
      activeIndex: matches.length > 0 ? Math.max(0, Math.min(state.search.activeIndex, matches.length - 1)) : -1,
    }
    selectedBaseIndex = state.selection.baseIndex
    hoveredBaseIndex = null
    syncSearchUi(false)
    refreshReadout()
    refreshSequence()
    setShareStatus(controls, '')
    schedulePermalinkPersist()
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
    restrictionSites = findRestrictionSites(mixedBaseResult.sequence, undefined, { circular: true })
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

  const syncSampleRibbon = () => {
    const show = viewerState === 'loaded' && traceSource?.kind === 'sample' && !sampleRibbonDismissed
    sampleRibbon.classList.toggle('hidden', !show)
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
      setPrintButtonState(controls, false)
    } else if (state === 'loaded') {
      successText.textContent = message
      status.textContent = message
      setControlsDisabled(controls, false)
      setPrintButtonState(controls, true)
    } else {
      status.textContent = 'No trace loaded.'
      setControlsDisabled(controls, false)
      setPrintButtonState(controls, false)
    }
    syncSearchUi(false)
    syncSampleRibbon()
  }

  const refreshReadout = () => {
    const vp = renderer.getViewportInfo()
    updatePositionReadout(readout, vp.start, vp.end)
    refreshAnnotationTrack()
    refreshPlasmidMap()
    refreshQualityTrack()
    schedulePermalinkPersist()
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

  const refreshPlasmidMap = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) {
      plasmidMap.clear()
      return
    }
    const viewportSamples = renderer.getViewportInfo()
    const visibleRange = mapSampleViewportToBaseRange(trace.peakPositions, {
      startSample: viewportSamples.start,
      endSample: viewportSamples.end,
    }, ANNOTATION_VIEWPORT_EXTRA_BASES)
    const orfFeatures = annotationFeatures.filter((feature) => feature.type === 'orf')
    plasmidMap.render({
      sequenceLength: trace.baseCalls.length,
      activeRange: visibleRange,
      orfFeatures,
      restrictionSites,
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
    schedulePermalinkPersist()
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
    if (!select && hit.index === hoveredBaseIndex) return
    if (select) {
      selectedBaseIndex = hit.index
      hoveredBaseIndex = null
      schedulePermalinkPersist()
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
   * Sync the ContigPanel enabled/disabled state based on resident-slot count.
   * Enables "Assemble pair" only when exactly 2 traces are resident.
   * Clears any stale contig result when the trace set changes.
   */
  const syncContigPanel = () => {
    const residentSlots = workspace.getAll().filter((s) => s.rawTrace !== null)
    const canAssemble = residentSlots.length === 2
    setAssembleButtonEnabled(contigPanelElements, canAssemble)
    // Clear previous result whenever the resident trace set changes.
    currentContig = null
    clearContigPanel(contigPanelElements)
    clearPrimerPanel(primerPanelElements)
  }

  /**
   * Run the overlap-based contig assembly for the two resident traces
   * and render the result in the ContigPanel.
   */
  const runContigAssembly = () => {
    const residentSlots = workspace.getAll().filter((s) => s.rawTrace !== null)
    if (residentSlots.length !== 2) {
      setContigPanelStatus(contigPanelElements, 'Exactly 2 traces must be loaded to assemble.', 'error')
      return
    }
    const [slotA, slotB] = residentSlots
    const qualA = slotA.rawTrace!.qualities ? Array.from(slotA.rawTrace!.qualities) : null
    const qualB = slotB.rawTrace!.qualities ? Array.from(slotB.rawTrace!.qualities) : null

    const controls = getAssemblyControls(contigPanelElements)

    setContigPanelStatus(contigPanelElements, 'Assembling…', 'idle')
    const contig = assembleWithControls(
      { id: slotA.id, fileName: slotA.fileName, sequence: slotA.rawTrace!.sequence, qualities: qualA },
      { id: slotB.id, fileName: slotB.fileName, sequence: slotB.rawTrace!.sequence, qualities: qualB },
      controls,
    )

    if (!contig) {
      currentContig = null
      setContigPanelStatus(
        contigPanelElements,
        `No overlap found (min ${controls.minOverlap} bp, min match ${Math.round(controls.minMatchFraction * 100)} %). Try adjusting the controls or loading a forward + reverse pair from the same amplicon.`,
        'error',
      )
      return
    }

    currentContig = contig
    renderContigPanel(contigPanelElements, contig)
    setContigPanelStatus(contigPanelElements, '', 'success')
  }

  /**
   * Apply per-variant review overrides from `variantReviews` to the
   * base `calledVariants` array and sync the variant table.
   */
  const getEffectiveVariants = (): CalledVariant[] =>
    calledVariants.map((v) => ({
      ...v,
      review: variantReviews[v.id] ?? v.review,
    }))

  const refreshVariantTable = () => {
    const effective = getEffectiveVariants()
    renderVariantTable(variantTableElements, effective, variantFilterMode, selectedVariantId)
    setVariantTableVisible(variantTableElements, alignmentResult !== null)
  }

  /**
   * Run reference alignment for the active trace slot, then call variants.
   * Updates all relevant UI panels.
   */
  const runAlignment = (refSeq: string, refName: string) => {
    if (!rawTrace) return
    const displayTrace = renderer.getCurrentTrace() ?? rawTrace

    // Use the currently-displayed sequence (with edits + strand applied).
    const readSeq = displayTrace.sequence
    const qualities = displayTrace.qualities

    setReferencePanelStatus(referencePanelElements, 'Aligning…', 'idle')

    // Run synchronously (sequences are short for Sanger reads).
    const result = alignReadToReference(readSeq, refSeq, refName, activeSlotId ?? 'slot', DEFAULT_ALIGNMENT_BANDWIDTH)
    alignmentResult = result
    referenceSequence = refSeq
    referenceId = refName

    // Determine the sequence actually used in alignment (strand-corrected).
    const alignedReadSeq = result.strand === 'reverse'
      ? displayTrace.sequence  // aligner already ran on RC internally
      : readSeq

    calledVariants = callVariants(result, alignedReadSeq, refSeq, qualities)
    variantReviews = {}
    selectedVariantId = null

    const strand = result.strand
    const status = `Aligned ${strand} · ref pos ${result.refStart}–${result.refEnd} · score ${result.score.toFixed(0)} · ${calledVariants.length} variant${calledVariants.length !== 1 ? 's' : ''}`
    setReferencePanelStatus(referencePanelElements, status, 'success')

    refreshVariantTable()

    // Persist to active slot.
    if (activeSlotId) {
      workspace.updateSlot(activeSlotId, {
        alignmentResult,
        referenceSequence,
        referenceId,
        variantReviews: { ...variantReviews },
      })
    }
  }

  /**
   * Clear alignment state (when trace changes or user clicks "Clear").
   */
  const clearAlignment = () => {
    alignmentResult = null
    referenceSequence = null
    referenceId = null
    calledVariants = []
    variantReviews = {}
    selectedVariantId = null
    referencePanelElements.textarea.value = ''
    referencePanelElements.alignBtn.disabled = true
    setReferencePanelStatus(referencePanelElements, '', 'idle')
    refreshVariantTable()
    if (activeSlotId) {
      workspace.updateSlot(activeSlotId, {
        alignmentResult: null,
        referenceSequence: null,
        referenceId: null,
        variantReviews: {},
      })
    }
  }

  /**
   * Save the currently active slot's per-slot state back into the workspace
   * so it is correctly restored when switching back later.
   */
  const saveCurrentSlot = () => {
    if (!activeSlotId) return
    workspace.updateSlot(activeSlotId, {
      rawTrace,
      ...(traceSource ? { source: traceSource } : {}),
      isRevcomp,
      trimSettings: { ...trimSettings },
      trimResult,
      searchState: { ...searchState },
      mixedBaseThreshold,
      mixedBaseResult,
      viewport: renderer.getViewportState(),
      sampleRibbonDismissed,
      alignmentResult,
      referenceSequence,
      referenceId,
      variantReviews: { ...variantReviews },
    })
  }

  const makeActiveSlot = (trace: TraceData) => {
    const slot = makeSlot(trace, traceSource ?? { kind: 'local', value: trace.fileName })
    slot.viewport = renderer.getViewportState()
    slot.mixedBaseThreshold = mixedBaseThreshold
    slot.mixedBaseResult = mixedBaseResult
    slot.sampleRibbonDismissed = traceSource?.kind === 'sample' ? sampleRibbonDismissed : false
    return slot
  }

  const clearRenderPanels = () => {
    renderer.clearTrace()
    annotationFeatures = []
    restrictionSites = []
    annotationTrack.clear()
    plasmidMap.clear()
    qualityTrack.clear()
    readout.textContent = 'Position: -'
    sequencePanel.textContent = 'Load a trace to inspect sequence'
  }

  const clearDisplayedTrace = () => {
    cancelMixedBaseRecompute()
    rawTrace = null
    traceSource = null
    isRevcomp = false
    trimSettings = { ...DEFAULT_TRIM_SETTINGS }
    trimResult = null
    mixedBaseThreshold = DEFAULT_MIXED_BASE_THRESHOLD
    mixedBaseResult = null
    searchState = { query: '', matches: [], activeIndex: -1 }
    sampleRibbonDismissed = false
    selectedBaseIndex = null
    hoveredBaseIndex = null
    editingIndex = -1
    alignmentResult = null
    referenceSequence = null
    referenceId = null
    calledVariants = []
    variantReviews = {}
    selectedVariantId = null
    editModel.reset()
    setUndoRedoState(controls, false, false)
    hideTooltip(tooltip)
    closeBaseInspector()
    setStrandToggleState(controls, false)
    setMixedThresholdDisplay(controls, mixedBaseThreshold)
    setMixedSummary(controls, 0)
    setShareStatus(controls, '')
    updateMetadataPanel(metadataPanel, null)
    setReferencePanelStatus(referencePanelElements, '', 'idle')
    setVariantTableVisible(variantTableElements, false)
    clearRenderPanels()
  }

  syncWorkspaceBar()
  refreshConsensus()
  syncContigPanel()

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
    traceSource = slot.source
    isRevcomp = slot.isRevcomp
    trimSettings = { ...slot.trimSettings }
    trimResult = slot.trimResult
    searchState = { ...slot.searchState }
    mixedBaseThreshold = slot.mixedBaseThreshold
    mixedBaseResult = slot.mixedBaseResult
    sampleRibbonDismissed = slot.sampleRibbonDismissed
    alignmentResult = slot.alignmentResult
    referenceSequence = slot.referenceSequence
    referenceId = slot.referenceId
    variantReviews = { ...slot.variantReviews }
    selectedVariantId = null

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
      // Restore alignment panel state.
      if (alignmentResult && referenceSequence) {
        const alignStatus = `Aligned ${alignmentResult.strand} · ref pos ${alignmentResult.refStart}–${alignmentResult.refEnd} · score ${alignmentResult.score.toFixed(0)}`
        setReferencePanelStatus(referencePanelElements, alignStatus, 'success')
        referencePanelElements.textarea.value = referenceSequence
        referencePanelElements.alignBtn.disabled = false
        // Re-derive variants from stored alignment (reviews are already restored).
        const displayTrace = renderer.getCurrentTrace() ?? rawTrace
        calledVariants = callVariants(alignmentResult, displayTrace.sequence, referenceSequence, displayTrace.qualities)
      } else {
        setReferencePanelStatus(referencePanelElements, '', 'idle')
        calledVariants = []
      }
      refreshVariantTable()
    } else {
      // Evicted slot — show the file name but indicate it needs reloading.
      closeBaseInspector()
      updateMetadataPanel(metadataPanel, null)
      clearRenderPanels()
      alignmentResult = null
      calledVariants = []
      setReferencePanelStatus(referencePanelElements, '', 'idle')
      setVariantTableVisible(variantTableElements, false)
      setState('error', `${slot.fileName} was evicted from memory — please re-open the file`)
    }

    syncWorkspaceBar()
    refreshConsensus()
    syncContigPanel()
  }

  const beginLoad = (message: string) => {
    loadRequestId += 1
    cancelMixedBaseRecompute()
    saveCurrentSlot()
    setState('loading', message)
    return loadRequestId
  }

  const shouldReplacePlaceholderSample = (source: PermalinkSource) => {
    if (source.kind !== 'local') return false
    const activeSlot = workspace.getActive()
    return activeSlot !== null
      && activeSlot.id === activeSlotId
      && activeSlot.source.kind === 'sample'
      && workspace.getAll().length === 1
  }

  const applyPendingPermalinkIfReady = (source: PermalinkSource) => {
    if (!pendingPermalink) return
    const sourceMatches = pendingPermalink.source.kind === source.kind
      && pendingPermalink.source.value === source.value
    if (!sourceMatches) return
    applyPermalinkState(pendingPermalink)
    pendingPermalink = null
    if (source.kind === 'local') setPermalinkHint('')
  }

  const commitLoadedTrace = (trace: TraceData, source: PermalinkSource) => {
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
    traceSource = source
    sampleRibbonDismissed = false
    editingIndex = -1
    editModel.reset()
    setStrandToggleState(controls, false)
    setMixedThresholdDisplay(controls, mixedBaseThreshold)
    setUndoRedoState(controls, false, false)
    hideTooltip(tooltip)
    updateMetadataPanel(metadataPanel, trace.metadata)
    applyDisplayTrace()

    const slot = makeActiveSlot(trace)
    if (shouldReplacePlaceholderSample(source) && activeSlotId) {
      workspace.updateSlot(activeSlotId, slot)
      workspace.activate(activeSlotId)
    } else {
      const newId = workspace.add(slot)
      activeSlotId = newId
    }
    applyPendingPermalinkIfReady(source)
    saveCurrentSlot()
    syncWorkspaceBar()
    refreshConsensus()
    syncContigPanel()
    const msg = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
    setState('loaded', msg)
  }

  const load = async (file: File) => {
    const requestId = beginLoad(`Loading ${file.name}…`)
    try {
      const buffer = await file.arrayBuffer()
      if (requestId !== loadRequestId) return
      const trace = await parseInWorker(buffer, file.name)
      if (requestId !== loadRequestId) return
      commitLoadedTrace(trace, { kind: 'local', value: file.name })
    } catch (error) {
      if (requestId !== loadRequestId) return
      clearDisplayedTrace()
      activeSlotId = null
      syncWorkspaceBar()
      refreshConsensus()
      syncContigPanel()
      const msg = error instanceof Error ? error.message : 'Failed to parse file'
      setState('error', msg)
    }
  }

  const loadSample = async () => {
    const requestId = beginLoad('Loading sample trace…')
    try {
      const sampleBaseUrl = (import.meta.env.BASE_URL as string).replace(/\/?$/, '/')
      const sampleUrl = `${sampleBaseUrl}sample.ab1`
      const response = await fetch(sampleUrl)
      if (!response.ok) throw new Error(`Could not fetch sample (${response.status})`)
      const buffer = await response.arrayBuffer()
      if (requestId !== loadRequestId) return
      const trace = await parseInWorker(buffer, 'sample.ab1')
      if (requestId !== loadRequestId) return
      commitLoadedTrace(trace, { kind: 'sample', value: 'sample.ab1' })
    } catch (error) {
      if (requestId !== loadRequestId) return
      clearDisplayedTrace()
      activeSlotId = null
      syncWorkspaceBar()
      refreshConsensus()
      syncContigPanel()
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
  if (pendingPermalink?.source.kind === 'local') {
    setPermalinkHint(`Permalink loaded. Reattach local file "${pendingPermalink.source.value}" to restore this exact view.`)
  } else {
    setPermalinkHint('')
  }
  if (pendingPermalink?.source.kind === 'sample') {
    void loadSample()
  }

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (!copied) throw new Error('Clipboard unavailable')
  }
  sampleRibbonDismissBtn.addEventListener('click', () => {
    sampleRibbonDismissed = true
    syncSampleRibbon()
    if (activeSlotId) {
      workspace.updateSlot(activeSlotId, { sampleRibbonDismissed: true })
    }
  })

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
        syncContigPanel()
      }
    } else {
      syncWorkspaceBar()
      refreshConsensus()
      syncContigPanel()
    }
  })

  root.addEventListener('workspace-open', () => {
    fileInputExtra.click()
  })

  // ── Contig assembly events ────────────────────────────────────────────────
  contigPanelElements.assembleBtn.addEventListener('click', () => {
    runContigAssembly()
  })

  // Live re-assembly when any control value changes (if a contig is already shown).
  const onControlChange = () => {
    if (currentContig !== null) {
      runContigAssembly()
    }
  }
  contigPanelElements.strandASelect.addEventListener('change', onControlChange)
  contigPanelElements.strandBSelect.addEventListener('change', onControlChange)
  contigPanelElements.minOverlapInput.addEventListener('change', onControlChange)
  contigPanelElements.minMatchInput.addEventListener('change', onControlChange)

  contigPanelElements.exportBtn.addEventListener('click', () => {
    if (!currentContig) return
    const fasta = toContigFasta(currentContig)
    const blob = new Blob([fasta], { type: 'text/plain' })
    downloadBlob(blob, 'contig.fasta')
  })

  // ── Primer / in-silico PCR events ──────────────────────────────────────────
  root.addEventListener('run-pcr', (event) => {
    const { forward, reverse } = (event as CustomEvent<{ forward: PrimerEntry; reverse: PrimerEntry }>).detail
    if (!rawTrace) {
      setPrimerPanelStatus(primerPanelElements, 'Load a trace first.', 'error')
      return
    }
    const displayTrace = renderer.getCurrentTrace() ?? rawTrace
    const templateSeq = displayTrace.sequence.toUpperCase()

    clearPrimerPanel(primerPanelElements)
    setPrimerPanelStatus(primerPanelElements, 'Searching…', 'idle')

    const fwdSites = findPrimerBindingSites('fwd', forward.sequence, templateSeq, 2)
    const revSites = findPrimerBindingSites('rev', reverse.sequence, templateSeq, 2)
    const amplicons = predictAmplicons(fwdSites, revSites, templateSeq, false, 5000)

    renderPrimerResults(primerPanelElements, fwdSites, revSites, amplicons, forward, reverse)
  })

  primerPanelElements.exportBtn.addEventListener('click', () => {
    const root2 = primerPanelElements.root as HTMLDivElement & {
      _amplicons?: import('../types/primer').PredictedAmplicon[]
      _fwdEntry?: PrimerEntry
      _revEntry?: PrimerEntry
    }
    const amplicons = root2._amplicons
    const fwdEntry  = root2._fwdEntry
    const revEntry  = root2._revEntry
    if (!amplicons?.length || !fwdEntry || !revEntry) return
    const fasta = ampliconToFasta(amplicons[0], fwdEntry.name, revEntry.name)
    const blob = new Blob([fasta], { type: 'text/plain' })
    downloadBlob(blob, 'amplicon.fasta')
  })

  // ── Reference alignment events ─────────────────────────────────────────────
  referencePanelElements.alignBtn.addEventListener('click', () => {
    const raw = referencePanelElements.textarea.value.trim()
    if (!raw || !rawTrace) return
    const { name, sequence } = parseFastaSequence(raw)
    if (sequence.length === 0) {
      setReferencePanelStatus(referencePanelElements, 'No valid sequence found. Paste plain bases or FASTA.', 'error')
      return
    }
    runAlignment(sequence, name)
  })

  referencePanelElements.clearBtn.addEventListener('click', () => {
    clearAlignment()
  })

  // ── Variant table events ─────────────────────────────────────────────────────
  variantTableElements.tabBar.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]')
    if (!btn) return
    variantFilterMode = btn.dataset.filter as VariantFilterMode
    refreshVariantTable()
  })

  root.addEventListener('variant-select', (event) => {
    const { variantId } = (event as CustomEvent<{ variantId: string }>).detail
    selectedVariantId = selectedVariantId === variantId ? null : variantId
    refreshVariantTable()
    // Jump chromatogram to the read position of this variant.
    if (selectedVariantId) {
      const variant = getEffectiveVariants().find((v) => v.id === selectedVariantId)
      if (variant && variant.readIndex >= 0) {
        const displayTrace = renderer.getCurrentTrace()
        if (displayTrace) {
          const peakSample = displayTrace.peakPositions[variant.readIndex]
          if (peakSample !== undefined) {
            renderer.focusBaseRange(variant.readIndex, variant.readIndex)
            refreshReadout()
          }
        }
      }
    }
  })

  root.addEventListener('variant-review', (event) => {
    const { variantId, review } = (event as CustomEvent<{ variantId: string; review: CalledVariant['review'] }>).detail
    variantReviews = { ...variantReviews, [variantId]: review }
    refreshVariantTable()
    if (activeSlotId) workspace.updateSlot(activeSlotId, { variantReviews: { ...variantReviews } })
  })

  root.addEventListener('export-variants-csv', () => {
    const effective = getEffectiveVariants()
    const csv = toVariantsCsv(effective, referenceId ?? '')
    const blob = new Blob([csv], { type: 'text/csv' })
    const suffix = rawTrace ? rawTrace.fileName.replace(/\.[^.]+$/, '') : 'trace'
    downloadBlob(blob, `${suffix}-variants.csv`)
  })

  root.addEventListener('export-variants-vcf', () => {
    const effective = getEffectiveVariants()
    const vcf = toVariantsVcf(effective, referenceId ?? 'ref')
    const blob = new Blob([vcf], { type: 'text/tab-separated-values' })
    const suffix = rawTrace ? rawTrace.fileName.replace(/\.[^.]+$/, '') : 'trace'
    downloadBlob(blob, `${suffix}-variants.vcf.tsv`)
  })

  root.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).getAttribute('data-action')
    if (action === 'toggle-quality-track') {
      schedulePermalinkPersist()
    }
  })

  controls.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement
    const action = target.getAttribute('data-action')
    const trimMode = target.getAttribute('data-trim-mode') as 'full' | 'trimmed' | null
    const trace = renderer.getCurrentTrace()

    if (action === 'export-menu-toggle') {
      const toggle = controls.querySelector<HTMLButtonElement>('[data-action="export-menu-toggle"]')
      const isOpen = toggle?.getAttribute('aria-expanded') === 'true'
      setExportMenuOpen(controls, !isOpen)
      return
    }

    if (action === 'zoom-in') renderer.zoom(0.75)
    if (action === 'zoom-out') renderer.zoom(1.25)
    if (action === 'pan-left') renderer.panPixels(-80)
    if (action === 'pan-right') renderer.panPixels(80)
    if (action === 'fit') renderer.fitToScreen()

    // Close the export menu after any export action is triggered.
    if (action && action.startsWith('export-') && action !== 'export-menu-toggle') {
      setExportMenuOpen(controls, false)
    }
    if (action === 'print') {
      setExportMenuOpen(controls, false)
    }
    if (action === 'share-view') {
      const permalinkState = getPermalinkState()
      if (!permalinkState) {
        setShareStatus(controls, 'Load a trace before sharing a permalink.')
      } else {
        const encoded = encodePermalinkState(permalinkState, { maxChars: 1800 })
        if (!encoded.hash) {
          setShareStatus(controls, encoded.error ?? 'Could not create permalink.')
        } else {
          const permalinkUrl = `${location.origin}${location.pathname}${location.search}${encoded.hash}`
          try {
            await copyToClipboard(permalinkUrl)
            setShareStatus(controls, 'Link copied. Local files still require reattaching the source trace.')
          } catch {
            setShareStatus(controls, 'Copy failed. Copy the URL from your browser address bar.')
          }
        }
      }
    }

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

    if (action === 'print' && trace) {
      // Collect visible sequence from the sequence-panel spans.
      const seqSpans = Array.from(sequencePanel.querySelectorAll<HTMLSpanElement>('[data-base-index]'))
      const visibleSequence = seqSpans.map((s) => s.textContent ?? '').join('')

      // Capture canvas snapshots at the current zoom window.
      const chromatogramDataUrl = canvas.toDataURL('image/png')
      const qualCanvas = qualityTrack.element.querySelector<HTMLCanvasElement>('[data-testid="quality-track-canvas"]')
      const qualVisible = qualityTrack.element.getAttribute('data-visible') !== 'false'
      const qualityDataUrl = qualCanvas && qualVisible ? qualCanvas.toDataURL('image/png') : null

      const printData: PrintSectionData = {
        fileName: trace.fileName,
        totalBases: trace.baseCalls.length,
        isRevcomp,
        trimMode: trimSettings.mode,
        trimmedBp:
          trimResult?.status === 'ok'
            ? trimResult.trimEnd - trimResult.trimStart
            : null,
        meanQuality:
          trimResult?.status === 'ok' && Number.isFinite(trimResult.meanQuality)
            ? trimResult.meanQuality
            : null,
        visibleSequence,
        annotationCount: annotationFeatures.length,
        chromatogramDataUrl,
        qualityDataUrl,
      }

      const printEl = buildPrintSection(printData)
      document.body.appendChild(printEl)
      // Remove the print overlay when the print dialog is closed.
      window.addEventListener('afterprint', () => {
        if (printEl.parentNode) printEl.parentNode.removeChild(printEl)
      }, { once: true })
      window.print()
    }

    if (action === 'undo' && rawTrace) {
      editModel.undo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
    }

    if (action === 'redo' && rawTrace) {
      editModel.redo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
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
      schedulePermalinkPersist()
      return
    }
    if (target.getAttribute('data-mixed') === 'threshold') {
      const value = Number(target.value)
      mixedBaseThreshold = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_MIXED_BASE_THRESHOLD
      setMixedThresholdDisplay(controls, mixedBaseThreshold)
      scheduleMixedBaseRecompute()
      schedulePermalinkPersist()
      return
    }
    if (target.getAttribute('data-trim') !== 'threshold') return
    const value = Number(target.value)
    trimSettings = { ...trimSettings, threshold: value }
    // Update numeric display next to slider
    const display = controls.querySelector<HTMLOutputElement>('#trim-threshold-display')
    if (display) display.value = String(value)
    scheduleTrim()
    schedulePermalinkPersist()
  })

  controls.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement
    if (event.key === 'Escape') {
      const dropdown = controls.querySelector<HTMLElement>('.export-menu__dropdown')
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        event.preventDefault()
        setExportMenuOpen(controls, false)
        controls.querySelector<HTMLButtonElement>('[data-action="export-menu-toggle"]')?.focus()
        return
      }
    }
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

  // Close the export dropdown when clicking outside of it.
  document.addEventListener('click', (event) => {
    const dropdown = controls.querySelector<HTMLElement>('.export-menu__dropdown')
    if (dropdown && !dropdown.hasAttribute('hidden')) {
      const exportGroup = controls.querySelector<HTMLElement>('[data-group="export"]')
      if (exportGroup && !exportGroup.contains(event.target as Node)) {
        setExportMenuOpen(controls, false)
      }
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
    // Refocus the span at the same display index after re-render.
    const updatedSpan = sequencePanel.querySelector<HTMLElement>(`[data-base-index="${displayIdx}"]`)
    updatedSpan?.focus()
    schedulePermalinkPersist()
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
        const refreshedSpan = sequencePanel.querySelector<HTMLElement>(`[data-base-index="${displayIdx}"]`)
        refreshedSpan?.focus()
        schedulePermalinkPersist()
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
      schedulePermalinkPersist()
    } else if ((event.ctrlKey || event.metaKey) && ((key === 'z' && event.shiftKey) || key === 'y')) {
      if (!editModel.canRedo) return
      event.preventDefault()
      editModel.redo()
      editingIndex = -1
      setUndoRedoState(controls, editModel.canUndo, editModel.canRedo)
      applyDisplayTrace(true)
      refreshSequence()
      schedulePermalinkPersist()
    }
  }
  document.addEventListener('keydown', undoRedoKeyHandler)

  syncSearchUi(false)
  if (!pendingPermalink) {
    queueMicrotask(() => void loadSample())
  }
  return root
}
