import type { TrimResult } from '../quality/mottTrim'
import { DEFAULT_MIXED_BASE_THRESHOLD } from '../calling/mixedBase'

export function createControls(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'controls'
  root.setAttribute('role', 'toolbar')
  root.setAttribute('aria-label', 'Trace viewer controls')
  root.innerHTML = `
    <div class="controls-group" role="group" aria-label="View" data-group="view">
      <span class="controls-group__label" aria-hidden="true">View</span>
      <button data-action="zoom-in">Zoom +</button>
      <button data-action="zoom-out">Zoom -</button>
      <button data-action="pan-left">← Pan</button>
      <button data-action="pan-right">Pan →</button>
      <button data-action="fit">Fit</button>
      <button data-action="toggle-strand" aria-pressed="false" title="Toggle reverse complement strand">5′→3′</button>
    </div>
    <div class="controls-group controls-group--export" role="group" aria-label="Export" data-group="export">
      <span class="controls-group__label" aria-hidden="true">Export</span>
      <div class="export-menu">
        <button
          class="export-menu__toggle"
          data-action="export-menu-toggle"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="Export menu"
        >Export ▾</button>
        <div class="export-menu__dropdown" role="menu" hidden>
          <button role="menuitem" data-action="export-png">Export PNG</button>
          <button role="menuitem" data-action="export-svg">Export SVG</button>
          <button role="menuitem" data-action="export-fasta">Export FASTA</button>
          <button role="menuitem" data-action="export-fastq">Export FASTQ</button>
          <button role="menuitem" data-action="export-qual">Export QUAL</button>
          <button role="menuitem" data-action="export-consensus-fasta" data-testid="export-consensus-fasta" disabled>Export Consensus FASTA</button>
          <button role="menuitem" data-action="print" data-testid="print-btn" aria-label="Print / Save as PDF" title="Print / Save as PDF" disabled>🖨 Print / Save as PDF</button>
        </div>
      </div>
    </div>
    <div class="controls-group" role="group" aria-label="Edit" data-group="edit">
      <span class="controls-group__label" aria-hidden="true">Edit</span>
      <button data-action="undo" aria-label="Undo base edit (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled>↩ Undo</button>
      <button data-action="redo" aria-label="Redo base edit (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled>↪ Redo</button>
    </div>
    <div class="controls-group controls-group--search" role="group" aria-label="Search" data-group="search">
      <span class="controls-group__label" aria-hidden="true">Search</span>
      <div class="search-controls" role="group" aria-label="Sequence search">
        <label class="search-label" for="search-input">
          <span class="search-label__text">Find:</span>
          <input
            id="search-input"
            class="search-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="characters"
            placeholder="IUPAC motif"
            aria-describedby="search-summary search-empty-state"
          />
        </label>
        <div class="search-actions">
          <button type="button" data-action="search-prev">Previous match</button>
          <button type="button" data-action="search-next">Next match</button>
          <button type="button" data-action="search-clear" aria-label="Clear search">Clear</button>
        </div>
        <span id="search-summary" class="search-summary" aria-live="polite" aria-atomic="true"></span>
        <span id="search-empty-state" class="search-empty-state hidden" role="status">No matches found.</span>
      </div>
    </div>
    <div class="controls-group controls-group--trim" role="group" aria-label="Quality trim" data-group="trim">
      <span class="controls-group__label" aria-hidden="true">Q-trim</span>
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
    </div>
    <div class="share-controls" role="group" aria-label="Shareable links">
      <button data-action="share-view" data-testid="share-view-btn">Share this view</button>
      <span id="share-status" class="share-status" role="status" aria-live="polite" aria-atomic="true"></span>
      <p class="share-note">
        Links are generated in-browser only. Sample + view-state links are shareable. Local files require reattaching the source trace, and very large state may exceed URL limits.
      </p>
    </div>
    <div class="controls-group controls-group--mixed" role="group" aria-label="Mixed-base" data-group="mixed">
      <span class="controls-group__label" aria-hidden="true">Mixed</span>
      <div class="mixed-controls" role="group" aria-label="Mixed-base calling">
        <label class="mixed-label" for="mixed-threshold">
          <span class="mixed-label__text">Mixed-base ratio:</span>
          <input
            type="range"
            id="mixed-threshold"
            data-mixed="threshold"
            min="0" max="1" step="0.01" value="${DEFAULT_MIXED_BASE_THRESHOLD.toFixed(2)}"
            aria-label="Mixed-base secondary to primary peak ratio threshold"
            class="mixed-slider"
          />
          <output id="mixed-threshold-display" for="mixed-threshold" class="mixed-value">${DEFAULT_MIXED_BASE_THRESHOLD.toFixed(2)}</output>
        </label>
        <span id="mixed-summary" class="mixed-summary" aria-live="polite" aria-atomic="true">0 ambiguous bases</span>
      </div>
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
    const action = (btn as HTMLButtonElement).getAttribute('data-action')
    // Export dropdown children are managed via the menu toggle button as a unit;
    // individual menu items are never directly toggled by setControlsDisabled.
    if (action && /^export-(?!menu-toggle)/.test(action)) return
    if (action === 'print') return
    // Undo/redo and export-consensus-fasta have their own enabled-state management;
    // only force-disable them during loading, never auto-enable on re-enable.
    if (!disabled && (action === 'undo' || action === 'redo')) return
    ;(btn as HTMLButtonElement).disabled = disabled
  })
  const slider = controls.querySelector<HTMLInputElement>('[data-trim="threshold"]')
  if (slider) slider.disabled = disabled
  const mixedSlider = controls.querySelector<HTMLInputElement>('[data-mixed="threshold"]')
  if (mixedSlider) mixedSlider.disabled = disabled
  const searchInput = controls.querySelector<HTMLInputElement>('#search-input')
  if (searchInput) searchInput.disabled = disabled
}

/** Open or close the export dropdown menu. */
export function setExportMenuOpen(controls: HTMLDivElement, open: boolean): void {
  const toggle = controls.querySelector<HTMLButtonElement>('[data-action="export-menu-toggle"]')
  const dropdown = controls.querySelector<HTMLElement>('.export-menu__dropdown')
  if (toggle) toggle.setAttribute('aria-expanded', String(open))
  if (dropdown) {
    if (open) {
      dropdown.removeAttribute('hidden')
    } else {
      dropdown.setAttribute('hidden', '')
    }
  }
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

export function setSearchSummary(controls: HTMLDivElement, summary: string): void {
  const el = controls.querySelector<HTMLElement>('#search-summary')
  if (el) el.textContent = summary
}

export function setSearchEmptyState(controls: HTMLDivElement, visible: boolean): void {
  const el = controls.querySelector<HTMLElement>('#search-empty-state')
  if (el) el.classList.toggle('hidden', !visible)
}

export function setSearchNavigationState(
  controls: HTMLDivElement,
  options: { canNavigate: boolean; canClear: boolean },
): void {
  const prev = controls.querySelector<HTMLButtonElement>('[data-action="search-prev"]')
  const next = controls.querySelector<HTMLButtonElement>('[data-action="search-next"]')
  const clear = controls.querySelector<HTMLButtonElement>('[data-action="search-clear"]')
  if (prev) prev.disabled = !options.canNavigate
  if (next) next.disabled = !options.canNavigate
  if (clear) clear.disabled = !options.canClear
}

export function setMixedThresholdDisplay(controls: HTMLDivElement, threshold: number): void {
  const slider = controls.querySelector<HTMLInputElement>('[data-mixed="threshold"]')
  if (slider) slider.value = threshold.toFixed(2)
  const output = controls.querySelector<HTMLOutputElement>('#mixed-threshold-display')
  if (output) output.value = threshold.toFixed(2)
}

export function setMixedSummary(controls: HTMLDivElement, ambiguousCount: number): void {
  const summary = controls.querySelector<HTMLElement>('#mixed-summary')
  if (!summary) return
  summary.textContent = `${ambiguousCount} ambiguous base${ambiguousCount === 1 ? '' : 's'}`
}

export function setShareStatus(controls: HTMLDivElement, message: string): void {
  const el = controls.querySelector<HTMLElement>('#share-status')
  if (el) el.textContent = message
}

/** Update disabled state of the undo and redo toolbar buttons. */
export function setUndoRedoState(controls: HTMLDivElement, canUndo: boolean, canRedo: boolean): void {
  const undoBtn = controls.querySelector<HTMLButtonElement>('[data-action="undo"]')
  const redoBtn = controls.querySelector<HTMLButtonElement>('[data-action="redo"]')
  if (undoBtn) undoBtn.disabled = !canUndo
  if (redoBtn) redoBtn.disabled = !canRedo
}

/**
 * Enable or disable the "Export Consensus FASTA" button.
 * The button should be enabled only when at least 2 resident (non-evicted) traces are loaded.
 */
export function setConsensusFastaButtonState(controls: HTMLDivElement, enabled: boolean): void {
  const btn = controls.querySelector<HTMLButtonElement>('[data-action="export-consensus-fasta"]')
  if (btn) btn.disabled = !enabled
}

/**
 * Enable or disable the "Print / Save as PDF" button.
 * Enabled only when a trace is currently loaded (rawTrace !== null).
 */
export function setPrintButtonState(controls: HTMLDivElement, enabled: boolean): void {
  const btn = controls.querySelector<HTMLButtonElement>('[data-action="print"]')
  if (btn) btn.disabled = !enabled
}
