import type { TrimResult } from '../quality/mottTrim'
import type { SearchStrand } from '../search/findSubsequence'

interface SearchUiState {
  hasTrace: boolean
  query: string
  hitCount: number
  activeHitIndex: number
  activeStrand: SearchStrand | null
}

export function createControls(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'controls'
  root.setAttribute('role', 'toolbar')
  root.setAttribute('aria-label', 'Trace viewer controls')
  root.innerHTML = `
    <button data-action="zoom-in">Zoom +</button>
    <button data-action="zoom-out">Zoom -</button>
    <button data-action="pan-left">← Pan</button>
    <button data-action="pan-right">Pan →</button>
    <button data-action="fit">Fit</button>
    <button data-action="toggle-strand" aria-pressed="false" title="Toggle reverse complement strand">5′→3′</button>
    <button data-action="export-png">Export PNG</button>
    <button data-action="export-fasta">Export FASTA</button>
    <div class="trim-controls" role="group" aria-label="Quality trimming">
      <label class="trim-label" for="trim-threshold">
        <span class="trim-label__text">Q-trim:</span>
        <input
          type="range"
          id="trim-threshold"
          data-trim="threshold"
          min="0" max="40" step="1" value="20"
          aria-label="Quality trim threshold"
          class="trim-slider"
        />
        <output id="trim-threshold-display" for="trim-threshold" class="trim-value">20</output>
      </label>
      <div class="trim-mode" role="group" aria-label="Sequence mode">
        <button
          data-trim-mode="full"
          class="trim-mode-btn trim-mode-btn--active"
          aria-pressed="true"
          title="Show full (untrimmed) sequence"
        >Full</button>
        <button
          data-trim-mode="trimmed"
          class="trim-mode-btn"
          aria-pressed="false"
          title="Show trimmed sequence only"
        >Trimmed</button>
      </div>
      <span id="trim-summary" class="trim-summary" aria-live="polite" aria-atomic="true"></span>
    </div>
    <div class="search-controls" role="group" aria-label="Subsequence search">
      <label class="search-label" for="search-query">Find:</label>
      <input
        id="search-query"
        data-search="query"
        class="search-input"
        type="text"
        inputmode="text"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="IUPAC motif"
        aria-describedby="search-summary"
      />
      <div class="search-actions">
        <button data-search-action="previous" type="button">Previous</button>
        <button data-search-action="next" type="button">Next</button>
        <button data-search-action="clear" type="button">Clear</button>
      </div>
      <span id="search-summary" class="search-summary">Load a trace to search</span>
      <span id="search-live" class="sr-only" aria-live="polite" aria-atomic="true"></span>
    </div>
  `
  return root
}

/** Update the strand toggle button to reflect the current strand state. */
export function setStrandToggleState(controls: HTMLDivElement, isRevcomp: boolean): void {
  const btn = controls.querySelector<HTMLButtonElement>('[data-action="toggle-strand"]')
  if (!btn) return
  btn.setAttribute('aria-pressed', String(isRevcomp))
  btn.textContent = isRevcomp ? '3′→5′' : '5′→3′'
  btn.title = isRevcomp ? 'Showing reverse complement — click to show forward strand' : 'Showing forward strand — click to show reverse complement'
}

export function setControlsDisabled(controls: HTMLDivElement, disabled: boolean): void {
  controls.querySelectorAll('button').forEach((btn) => {
    ;(btn as HTMLButtonElement).disabled = disabled
  })
  const slider = controls.querySelector<HTMLInputElement>('[data-trim="threshold"]')
  if (slider) slider.disabled = disabled
  const searchInput = controls.querySelector<HTMLInputElement>('[data-search="query"]')
  if (searchInput) searchInput.disabled = disabled
}

/** Update the trim summary display after a trim recompute. */
export function setTrimSummary(controls: HTMLDivElement, result: TrimResult | null): void {
  const summary = controls.querySelector<HTMLElement>('#trim-summary')
  if (!summary) return
  if (!result) {
    summary.textContent = ''
    return
  }
  if (result.status === 'no-quality') {
    summary.textContent = 'No quality scores'
    return
  }
  if (result.status === 'all-trimmed') {
    summary.textContent = 'All bases below threshold'
    return
  }
  const meanQ = Number.isFinite(result.meanQuality) ? result.meanQuality.toFixed(1) : '—'
  summary.textContent = `${result.trimmedLength} bp kept · Q̄ ${meanQ}`
}

/** Set which mode button is active and keep aria-pressed in sync. */
export function setTrimMode(controls: HTMLDivElement, mode: 'full' | 'trimmed'): void {
  controls.querySelectorAll<HTMLButtonElement>('[data-trim-mode]').forEach((btn) => {
    const active = btn.getAttribute('data-trim-mode') === mode
    btn.setAttribute('aria-pressed', String(active))
    btn.classList.toggle('trim-mode-btn--active', active)
  })
}

/** Read the current threshold from the slider. */
export function getTrimThreshold(controls: HTMLDivElement): number {
  const slider = controls.querySelector<HTMLInputElement>('[data-trim="threshold"]')
  return slider ? Number(slider.value) : 20
}

export function setSearchState(controls: HTMLDivElement, state: SearchUiState): void {
  const summary = controls.querySelector<HTMLElement>('#search-summary')
  const live = controls.querySelector<HTMLElement>('#search-live')
  const previousButton = controls.querySelector<HTMLButtonElement>('[data-search-action="previous"]')
  const nextButton = controls.querySelector<HTMLButtonElement>('[data-search-action="next"]')
  const clearButton = controls.querySelector<HTMLButtonElement>('[data-search-action="clear"]')

  let summaryText = 'Enter a motif to search'
  let liveText = summaryText
  if (!state.hasTrace) {
    summaryText = 'Load a trace to search'
    liveText = summaryText
  } else if (!state.query) {
    summaryText = 'Enter a motif to search'
    liveText = summaryText
  } else if (state.hitCount === 0) {
    summaryText = `No matches for “${state.query}”`
    liveText = summaryText
  } else if (state.activeHitIndex >= 0) {
    const strandLabel = state.activeStrand === 'both' ? 'both strands' : `${state.activeStrand ?? 'forward'} strand`
    summaryText = `${state.hitCount} matches · hit ${state.activeHitIndex + 1} of ${state.hitCount}`
    liveText = `${summaryText} on ${strandLabel}`
  } else {
    summaryText = `${state.hitCount} matches`
    liveText = summaryText
  }

  if (summary) summary.textContent = summaryText
  if (live) live.textContent = liveText
  if (previousButton) previousButton.disabled = state.hitCount === 0
  if (nextButton) nextButton.disabled = state.hitCount === 0
  if (clearButton) clearButton.disabled = state.query.length === 0
}
