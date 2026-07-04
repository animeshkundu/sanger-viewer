/**
 * PrimerPanel.ts — DOM component for the primer design + in-silico PCR workspace.
 *
 * The panel provides:
 *  - Forward and reverse primer inputs (name + sequence).
 *  - Per-primer Tm / GC% / hairpin / self-dimer display + quality flags.
 *  - "Find binding sites" to search the loaded sequence.
 *  - "Run in-silico PCR" to predict amplicons from found sites.
 *  - Amplicon list with size, coordinates, mismatch counts.
 *  - Export amplicon as FASTA.
 *
 * Fires a custom `run-pcr` event on the root element when the PCR button is clicked.
 * All computation happens in the parent (TraceViewer) and results are fed back
 * via `renderPrimerResults`.
 *
 * Privacy: all data stays in the browser — no uploads.
 */

import {
  computeGC,
  computeTm,
  computeHairpinTm,
  computeSelfDimerScore,
  computePrimerFlags,
} from '../primers/tm'
import type { PrimerEntry, PrimerBindingSite, PredictedAmplicon } from '../types/primer'

export interface PrimerPanelElements {
  root: HTMLDivElement
  fwdNameInput: HTMLInputElement
  fwdSeqInput: HTMLInputElement
  revNameInput: HTMLInputElement
  revSeqInput: HTMLInputElement
  runBtn: HTMLButtonElement
  exportBtn: HTMLButtonElement
  statusSpan: HTMLSpanElement
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function makePrimerEntry(
  id: string,
  name: string,
  sequence: string,
  direction: 'forward' | 'reverse',
): PrimerEntry {
  const seq = sequence.trim().toUpperCase().replace(/\s+/g, '')
  const gc        = computeGC(seq)
  const tm        = computeTm(seq)
  const hairpinTm = computeHairpinTm(seq)
  const dimerScore = computeSelfDimerScore(seq)
  const flags      = computePrimerFlags(seq, gc, tm, hairpinTm, dimerScore)
  return { id, name: name || id, sequence: seq, direction, gcPercent: gc, tmCelsius: tm, hairpinTm, selfDimerScore: dimerScore, flags }
}

function renderPrimerStats(entry: PrimerEntry): string {
  const flagHtml = entry.flags.length > 0
    ? entry.flags.map((f) => `<span class="primer-flag">${escapeHtml(f)}</span>`).join(' ')
    : '<span class="primer-flag primer-flag--ok">✓ no issues</span>'
  const hairpin = entry.hairpinTm !== null ? `${entry.hairpinTm}°C` : '—'
  return `
    <div class="primer-stats" data-testid="primer-stats-${entry.id}">
      <span class="primer-stat">Tm <strong>${entry.tmCelsius}°C</strong></span>
      <span class="primer-stat">GC <strong>${entry.gcPercent.toFixed(1)}%</strong></span>
      <span class="primer-stat">Hairpin <strong>${hairpin}</strong></span>
      <span class="primer-stat">Self-dimer <strong>${entry.selfDimerScore} bp</strong></span>
      <span class="primer-stat">${entry.sequence.length} bp</span>
      <div class="primer-flags">${flagHtml}</div>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Create ────────────────────────────────────────────────────────────────────

export function createPrimerPanel(): PrimerPanelElements {
  const root = document.createElement('div')
  root.className = 'primer-panel'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Primer design and in-silico PCR')
  root.dataset.testid = 'primer-panel'

  root.innerHTML = `
    <div class="primer-panel__header">
      <h3 class="primer-panel__title">Primer Design &amp; In-Silico PCR</h3>
      <p class="primer-panel__hint">
        Enter primers to compute Tm/GC%/hairpin, find binding sites on the loaded
        sequence, and predict PCR amplicons — all in-browser, nothing uploaded.
      </p>
    </div>

    <div class="primer-panel__inputs">
      <!-- Forward primer -->
      <div class="primer-input-row" data-testid="primer-fwd-row">
        <div class="primer-input-row__header">
          <span class="primer-label primer-label--fwd">→ Forward</span>
          <input
            type="text"
            class="primer-input-row__name"
            placeholder="Name (optional)"
            aria-label="Forward primer name"
            data-testid="primer-fwd-name"
            value="Fwd"
          />
        </div>
        <input
          type="text"
          class="primer-input-row__seq"
          placeholder="5′-ACGTACGT…-3′"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="characters"
          aria-label="Forward primer sequence (5′ to 3′)"
          data-testid="primer-fwd-seq"
        />
        <div class="primer-input-row__stats" data-testid="primer-fwd-stats"></div>
      </div>

      <!-- Reverse primer -->
      <div class="primer-input-row" data-testid="primer-rev-row">
        <div class="primer-input-row__header">
          <span class="primer-label primer-label--rev">← Reverse</span>
          <input
            type="text"
            class="primer-input-row__name"
            placeholder="Name (optional)"
            aria-label="Reverse primer name"
            data-testid="primer-rev-name"
            value="Rev"
          />
        </div>
        <input
          type="text"
          class="primer-input-row__seq"
          placeholder="5′-ACGTACGT…-3′"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="characters"
          aria-label="Reverse primer sequence (5′ to 3′)"
          data-testid="primer-rev-seq"
        />
        <div class="primer-input-row__stats" data-testid="primer-rev-stats"></div>
      </div>
    </div>

    <div class="primer-panel__actions">
      <button
        type="button"
        id="primer-run-btn"
        class="primer-panel__run-btn"
        data-testid="primer-run-btn"
        disabled
        aria-label="Find binding sites and run in-silico PCR"
      >Run in-silico PCR</button>
      <button
        type="button"
        id="primer-export-btn"
        class="primer-panel__export-btn"
        data-testid="primer-export-btn"
        disabled
        aria-label="Export top amplicon as FASTA"
      >Export FASTA</button>
    </div>

    <div class="primer-panel__status" role="status" aria-live="polite" aria-atomic="true">
      <span id="primer-status" class="primer-panel__status-text" data-testid="primer-status"></span>
    </div>

    <div class="primer-panel__results" data-testid="primer-results" hidden></div>
  `

  const fwdNameInput = root.querySelector<HTMLInputElement>('[data-testid="primer-fwd-name"]')!
  const fwdSeqInput  = root.querySelector<HTMLInputElement>('[data-testid="primer-fwd-seq"]')!
  const revNameInput = root.querySelector<HTMLInputElement>('[data-testid="primer-rev-name"]')!
  const revSeqInput  = root.querySelector<HTMLInputElement>('[data-testid="primer-rev-seq"]')!
  const runBtn       = root.querySelector<HTMLButtonElement>('#primer-run-btn')!
  const exportBtn    = root.querySelector<HTMLButtonElement>('#primer-export-btn')!
  const statusSpan   = root.querySelector<HTMLSpanElement>('#primer-status')!

  // ── Live stats on sequence input ─────────────────────────────────────────────
  const updateStats = (seqInput: HTMLInputElement, statsDiv: HTMLElement, id: string, dir: 'forward' | 'reverse') => {
    const raw = seqInput.value.trim().replace(/\s+/g, '')
    if (raw.length < 4) {
      statsDiv.innerHTML = ''
      return
    }
    const nameInput = dir === 'forward' ? fwdNameInput : revNameInput
    const entry = makePrimerEntry(id, nameInput.value.trim() || id, raw, dir)
    statsDiv.innerHTML = renderPrimerStats(entry)
  }

  const onFwdInput = () => {
    const div = root.querySelector<HTMLElement>('[data-testid="primer-fwd-stats"]')!
    updateStats(fwdSeqInput, div, 'fwd', 'forward')
    runBtn.disabled = fwdSeqInput.value.trim().length < 4 || revSeqInput.value.trim().length < 4
  }
  const onRevInput = () => {
    const div = root.querySelector<HTMLElement>('[data-testid="primer-rev-stats"]')!
    updateStats(revSeqInput, div, 'rev', 'reverse')
    runBtn.disabled = fwdSeqInput.value.trim().length < 4 || revSeqInput.value.trim().length < 4
  }

  fwdSeqInput.addEventListener('input', onFwdInput)
  revSeqInput.addEventListener('input', onRevInput)
  fwdNameInput.addEventListener('input', onFwdInput)
  revNameInput.addEventListener('input', onRevInput)

  // ── Run button fires custom event ─────────────────────────────────────────────
  runBtn.addEventListener('click', () => {
    const fwdSeq  = fwdSeqInput.value.trim().toUpperCase().replace(/\s+/g, '')
    const revSeq  = revSeqInput.value.trim().toUpperCase().replace(/\s+/g, '')
    const fwdName = fwdNameInput.value.trim() || 'Fwd'
    const revName = revNameInput.value.trim() || 'Rev'
    if (fwdSeq.length < 4 || revSeq.length < 4) return

    const fwdEntry = makePrimerEntry('fwd', fwdName, fwdSeq, 'forward')
    const revEntry = makePrimerEntry('rev', revName, revSeq, 'reverse')

    root.dispatchEvent(new CustomEvent('run-pcr', {
      bubbles: true,
      detail: { forward: fwdEntry, reverse: revEntry },
    }))
  })

  return { root, fwdNameInput, fwdSeqInput, revNameInput, revSeqInput, runBtn, exportBtn, statusSpan }
}

// ── Render results ─────────────────────────────────────────────────────────────

/**
 * Populate the primer panel with binding sites and amplicon predictions.
 */
export function renderPrimerResults(
  elements: PrimerPanelElements,
  fwdSites: PrimerBindingSite[],
  revSites: PrimerBindingSite[],
  amplicons: PredictedAmplicon[],
  fwdEntry: PrimerEntry,
  revEntry: PrimerEntry,
): void {
  const { root, exportBtn, statusSpan } = elements
  const resultsDiv = root.querySelector<HTMLElement>('.primer-panel__results')!

  const totalSites = fwdSites.length + revSites.length
  const ampliconCount = amplicons.length

  statusSpan.textContent = `${totalSites} binding site${totalSites !== 1 ? 's' : ''} · ${ampliconCount} amplicon${ampliconCount !== 1 ? 's' : ''} predicted`
  root.dataset.statusKind = ampliconCount > 0 ? 'success' : 'idle'

  // ── Binding sites summary ────────────────────────────────────────────────────
  const fwdSiteRows = fwdSites.map((s) =>
    `<tr>
      <td>${escapeHtml(fwdEntry.name)}</td>
      <td>fwd (+)</td>
      <td>${s.start}</td>
      <td>${s.end}</td>
      <td>${s.mismatches}</td>
    </tr>`
  ).join('')

  const revSiteRows = revSites.map((s) =>
    `<tr>
      <td>${escapeHtml(revEntry.name)}</td>
      <td>rev (−)</td>
      <td>${s.start}</td>
      <td>${s.end}</td>
      <td>${s.mismatches}</td>
    </tr>`
  ).join('')

  // ── Amplicons ────────────────────────────────────────────────────────────────
  const ampliconRows = amplicons.map((a, i) => {
    const wrap = a.circularWrap ? ' <em>(circular wrap)</em>' : ''
    return `<tr data-amplicon-index="${i}" tabindex="0" aria-label="Amplicon ${i + 1}: ${a.size} bp">
      <td>${i + 1}</td>
      <td><strong>${a.size}</strong> bp${wrap}</td>
      <td>${a.forwardSiteStart}–${a.reverseSiteEnd}</td>
      <td>${a.mismatches.forward + a.mismatches.reverse}</td>
    </tr>`
  }).join('')

  const noAmpliconMsg = amplicons.length === 0
    ? `<p class="primer-panel__empty">No amplicons predicted — check primer orientation and mismatch tolerance.</p>`
    : ''

  resultsDiv.innerHTML = `
    <section class="primer-panel__section" aria-label="Binding sites">
      <h4 class="primer-panel__section-title">Binding Sites</h4>
      ${totalSites === 0
        ? '<p class="primer-panel__empty">No binding sites found on the loaded sequence.</p>'
        : `<div class="primer-table-wrap">
            <table class="primer-table" aria-label="Primer binding sites">
              <thead><tr><th>Primer</th><th>Strand</th><th>Start</th><th>End</th><th>MM</th></tr></thead>
              <tbody>${fwdSiteRows}${revSiteRows}</tbody>
            </table>
          </div>`
      }
    </section>

    <section class="primer-panel__section" aria-label="Predicted amplicons">
      <h4 class="primer-panel__section-title">Predicted Amplicons</h4>
      ${noAmpliconMsg}
      ${amplicons.length > 0
        ? `<div class="primer-table-wrap">
            <table class="primer-table" data-testid="primer-amplicons-table" aria-label="Predicted amplicons">
              <thead><tr><th>#</th><th>Size</th><th>Coordinates</th><th>Mismatches</th></tr></thead>
              <tbody>${ampliconRows}</tbody>
            </table>
          </div>`
        : ''
      }
    </section>
  `
  resultsDiv.hidden = false

  // Enable export if we have at least one amplicon.
  exportBtn.disabled = amplicons.length === 0

  // Store amplicons for export handler.
  ;(root as HTMLDivElement & { _amplicons?: PredictedAmplicon[]; _fwdEntry?: PrimerEntry; _revEntry?: PrimerEntry })._amplicons = amplicons
  ;(root as HTMLDivElement & { _fwdEntry?: PrimerEntry })._fwdEntry = fwdEntry
  ;(root as HTMLDivElement & { _revEntry?: PrimerEntry })._revEntry = revEntry
}

/**
 * Set a status message (error or progress).
 */
export function setPrimerPanelStatus(
  elements: PrimerPanelElements,
  message: string,
  kind: 'idle' | 'success' | 'error' = 'idle',
): void {
  elements.statusSpan.textContent = message
  elements.root.dataset.statusKind = kind
}

/**
 * Clear results and reset export button.
 */
export function clearPrimerPanel(elements: PrimerPanelElements): void {
  const resultsDiv = elements.root.querySelector<HTMLElement>('.primer-panel__results')!
  resultsDiv.hidden = true
  resultsDiv.innerHTML = ''
  elements.exportBtn.disabled = true
  elements.statusSpan.textContent = ''
  elements.root.dataset.statusKind = 'idle'
}
