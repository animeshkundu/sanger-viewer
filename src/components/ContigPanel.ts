/**
 * ContigPanel.ts — DOM component for the paired-read contig assembly view.
 *
 * Shows a three-row display (forward read, reverse read, consensus) with
 * per-position coverage/mismatch highlighting and an export button.
 * Hidden by default; revealed only when a contig has been assembled.
 *
 * v26 addition: assembly-controls section (strand override selects,
 * minOverlap and minMatch numeric inputs) above the action buttons.
 */

import type { PairedContig } from '../consensus/contig'
import { type AssemblyControlState, DEFAULT_ASSEMBLY_CONTROLS } from '../consensus/assemblyControls'

/** Maximum bases to display in the sequence rows at one time. */
const WINDOW = 80

export interface ContigPanelElements {
  root: HTMLDivElement
  assembleBtn: HTMLButtonElement
  exportBtn: HTMLButtonElement
  statusSpan: HTMLSpanElement
  strandASelect: HTMLSelectElement
  strandBSelect: HTMLSelectElement
  minOverlapInput: HTMLInputElement
  minMatchInput: HTMLInputElement
}

/**
 * Create the ContigPanel elements.
 * Attach to the DOM; call `renderContigPanel` to populate.
 */
export function createContigPanel(): ContigPanelElements {
  const root = document.createElement('div')
  root.className = 'contig-panel'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Paired-read contig assembly')
  root.dataset.testid = 'contig-panel'

  root.innerHTML = `
    <div class="contig-panel__header">
      <h3 class="contig-panel__title">Contig Assembly</h3>
      <p class="contig-panel__hint">
        Assemble the two loaded reads into a consensus contig.
        All computation is in-browser — nothing is uploaded.
        (Ungapped v1; gapped assembly is a planned follow-up.)
      </p>
      <div class="contig-panel__controls" role="group" aria-label="Assembly controls">
        <div class="contig-panel__control-group">
          <label class="contig-panel__control-label" for="strand-a-select">Strand A</label>
          <select
            id="strand-a-select"
            class="contig-panel__control-select"
            data-testid="strand-a-select"
            aria-label="Strand override for read A"
          >
            <option value="auto" selected>Auto</option>
            <option value="forward">Force Forward</option>
            <option value="reverse">Force Reverse</option>
          </select>
        </div>
        <div class="contig-panel__control-group">
          <label class="contig-panel__control-label" for="strand-b-select">Strand B</label>
          <select
            id="strand-b-select"
            class="contig-panel__control-select"
            data-testid="strand-b-select"
            aria-label="Strand override for read B"
          >
            <option value="auto" selected>Auto</option>
            <option value="forward">Force Forward</option>
            <option value="reverse">Force Reverse</option>
          </select>
        </div>
        <div class="contig-panel__control-group">
          <label class="contig-panel__control-label" for="min-overlap-input">Min overlap (bp)</label>
          <input
            type="number"
            id="min-overlap-input"
            class="contig-panel__control-input"
            data-testid="min-overlap-input"
            min="5"
            max="200"
            step="1"
            value="${DEFAULT_ASSEMBLY_CONTROLS.minOverlap}"
            aria-label="Minimum overlap length in base pairs"
          />
        </div>
        <div class="contig-panel__control-group">
          <label class="contig-panel__control-label" for="min-match-input">Min match (%)</label>
          <input
            type="number"
            id="min-match-input"
            class="contig-panel__control-input"
            data-testid="min-match-input"
            min="0"
            max="100"
            step="1"
            value="0"
            aria-label="Minimum overlap match percentage (0 = any positive-scoring overlap)"
          />
        </div>
      </div>
      <div class="contig-panel__actions">
        <button
          type="button"
          id="assemble-btn"
          class="contig-panel__assemble-btn"
          data-action="assemble-pair"
          data-testid="assemble-btn"
          disabled
          aria-label="Assemble the two loaded reads into a contig"
        >Assemble pair</button>
        <button
          type="button"
          id="contig-export-btn"
          class="contig-panel__export-btn"
          data-action="export-contig-fasta"
          data-testid="contig-export-btn"
          disabled
          aria-label="Export contig as FASTA"
        >Export contig FASTA</button>
      </div>
      <div class="contig-panel__status" role="status" aria-live="polite" aria-atomic="true">
        <span id="contig-status" class="contig-panel__status-text" data-testid="contig-status"></span>
      </div>
    </div>
    <div class="contig-panel__body" hidden></div>
  `

  const assembleBtn      = root.querySelector<HTMLButtonElement>('#assemble-btn')!
  const exportBtn        = root.querySelector<HTMLButtonElement>('#contig-export-btn')!
  const statusSpan       = root.querySelector<HTMLSpanElement>('#contig-status')!
  const strandASelect    = root.querySelector<HTMLSelectElement>('#strand-a-select')!
  const strandBSelect    = root.querySelector<HTMLSelectElement>('#strand-b-select')!
  const minOverlapInput  = root.querySelector<HTMLInputElement>('#min-overlap-input')!
  const minMatchInput    = root.querySelector<HTMLInputElement>('#min-match-input')!

  return { root, assembleBtn, exportBtn, statusSpan, strandASelect, strandBSelect, minOverlapInput, minMatchInput }
}

/**
 * Set whether the "Assemble pair" button is enabled.
 * Should be enabled only when exactly 2 traces are resident.
 */
export function setAssembleButtonEnabled(elements: ContigPanelElements, enabled: boolean): void {
  elements.assembleBtn.disabled = !enabled
}

/**
 * Populate the contig panel body with a successfully assembled contig.
 * Reveals the body section and enables the FASTA export button.
 *
 * @param elements  Panel elements returned by createContigPanel().
 * @param contig    Output of buildPairedContig().
 * @param anchor    0-based consensus index to centre the window on (default 0).
 */
export function renderContigPanel(
  elements: ContigPanelElements,
  contig: PairedContig,
  anchor = 0,
): void {
  const { root, exportBtn, statusSpan } = elements
  const body = root.querySelector<HTMLElement>('.contig-panel__body')!

  exportBtn.disabled = false

  const halfWin = Math.floor(WINDOW / 2)
  const start = Math.max(0, Math.min(anchor - halfWin, contig.contigLength - WINDOW))
  const end   = Math.min(contig.contigLength, start + WINDOW)

  // Build the three sequence rows.
  const fwdCells: string[] = []
  const revCells: string[] = []
  const consCells: string[] = []

  for (let i = start; i < end; i++) {
    const sp = contig.support[i]
    const inOverlap = i >= contig.overlapStart && i <= contig.overlapEnd
    const isMismatch = inOverlap && sp.forwardBase !== undefined && sp.reverseBase !== undefined
      && sp.forwardBase !== sp.reverseBase

    const pos1 = i + 1  // 1-based for display

    // Forward row cell
    const fwdBase = sp.forwardBase ?? '·'
    const fwdClass = ['contig-base', 'contig-base--fwd', inOverlap ? 'contig-base--overlap' : '']
      .filter(Boolean).join(' ')
    fwdCells.push(
      `<span class="${fwdClass}" data-pos="${pos1}" aria-label="fwd pos ${pos1}: ${fwdBase}">${fwdBase}</span>`
    )

    // Reverse row cell
    const revBase = sp.reverseBase ?? '·'
    const revClass = ['contig-base', 'contig-base--rev', inOverlap ? 'contig-base--overlap' : '']
      .filter(Boolean).join(' ')
    revCells.push(
      `<span class="${revClass}" data-pos="${pos1}" aria-label="rev pos ${pos1}: ${revBase}">${revBase}</span>`
    )

    // Consensus row cell
    const consBase = contig.consensus[i]
    const consClass = [
      'contig-base', 'contig-base--cons',
      isMismatch ? 'contig-base--mismatch' : '',
      inOverlap ? 'contig-base--overlap' : '',
    ].filter(Boolean).join(' ')
    consCells.push(
      `<span class="${consClass}" data-pos="${pos1}" aria-label="cons pos ${pos1}: ${consBase}">${consBase}</span>`
    )
  }

  const orientationLabel = contig.orientation === 'fr' ? 'fwd→rev' : 'rev→fwd'

  body.innerHTML = `
    <div class="contig-panel__summary" data-testid="contig-summary">
      ${contig.contigLength} bp contig · ${contig.overlapLength} bp overlap ·
      ${contig.mismatchCount} disagreement${contig.mismatchCount === 1 ? '' : 's'} ·
      ${contig.singleCoverageCount} single-coverage bp · orientation ${orientationLabel}
    </div>
    <div class="contig-panel__rows" role="table" aria-label="Contig sequence rows">
      <div class="contig-panel__row" role="row" aria-label="${contig.fwdName} (forward)">
        <span class="contig-panel__row-label" role="rowheader" aria-label="Forward read: ${contig.fwdName}">Fwd</span>
        <div class="contig-panel__seq" role="cell" data-testid="contig-fwd-seq" aria-label="Forward read sequence">${fwdCells.join('')}</div>
      </div>
      <div class="contig-panel__row" role="row" aria-label="${contig.revName} (reverse)">
        <span class="contig-panel__row-label" role="rowheader" aria-label="Reverse read: ${contig.revName}">Rev</span>
        <div class="contig-panel__seq" role="cell" data-testid="contig-rev-seq" aria-label="Reverse read sequence">${revCells.join('')}</div>
      </div>
      <div class="contig-panel__row contig-panel__row--cons" role="row" aria-label="Consensus">
        <span class="contig-panel__row-label" role="rowheader">Cons</span>
        <div class="contig-panel__seq" role="cell" data-testid="contig-cons-seq" aria-label="Consensus sequence">${consCells.join('')}</div>
      </div>
    </div>
  `
  body.hidden = false

  statusSpan.textContent = ''
}

/**
 * Show an error or status message in the panel (e.g. "No overlap found").
 */
export function setContigPanelStatus(
  elements: ContigPanelElements,
  message: string,
  kind: 'idle' | 'success' | 'error' = 'idle',
): void {
  elements.statusSpan.textContent = message
  elements.root.dataset.statusKind = kind
}

/**
 * Clear the contig body (e.g. when traces change) and disable export.
 */
export function clearContigPanel(elements: ContigPanelElements): void {
  const body = elements.root.querySelector<HTMLElement>('.contig-panel__body')!
  body.hidden = true
  body.innerHTML = ''
  elements.exportBtn.disabled = true
  elements.statusSpan.textContent = ''
  elements.root.dataset.statusKind = 'idle'
}

/**
 * Read the current assembly-control values from the panel UI and return them
 * as an AssemblyControlState.  Safe to call at any time.
 */
export function getAssemblyControls(elements: ContigPanelElements): AssemblyControlState {
  const strandA = (elements.strandASelect.value || 'auto') as AssemblyControlState['strandA']
  const strandB = (elements.strandBSelect.value || 'auto') as AssemblyControlState['strandB']
  const minOverlap = Math.max(5, Math.min(200, parseInt(elements.minOverlapInput.value, 10) || DEFAULT_ASSEMBLY_CONTROLS.minOverlap))
  const minMatchPct = Math.max(0, Math.min(100, parseInt(elements.minMatchInput.value, 10) || 0))
  return {
    strandA,
    strandB,
    minOverlap,
    minMatchFraction: minMatchPct / 100,
  }
}
