/**
 * ContigPanel.ts — DOM component for the paired-read contig assembly view.
 *
 * Shows a three-row display (forward read, reverse read, consensus) with
 * per-position coverage/mismatch highlighting and an export button.
 * Hidden by default; revealed only when a contig has been assembled.
 */

import type { PairedContig } from '../consensus/contig'

/** Maximum bases to display in the sequence rows at one time. */
const WINDOW = 80

export interface ContigPanelElements {
  root: HTMLDivElement
  assembleBtn: HTMLButtonElement
  exportBtn: HTMLButtonElement
  statusSpan: HTMLSpanElement
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

  const assembleBtn = root.querySelector<HTMLButtonElement>('#assemble-btn')!
  const exportBtn   = root.querySelector<HTMLButtonElement>('#contig-export-btn')!
  const statusSpan  = root.querySelector<HTMLSpanElement>('#contig-status')!

  return { root, assembleBtn, exportBtn, statusSpan }
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
