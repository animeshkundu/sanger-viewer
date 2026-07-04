/**
 * ConsensusRow — DOM component for the multi-trace consensus view.
 *
 * Renders a summary line (mismatch count) and a monospace 80-base-window
 * sequence view with per-position mismatch highlighting.
 */

import type { ConsensusResult } from '../consensus/consensus'

/** Maximum number of bases to render in the consensus row at once. */
const WINDOW = 80

/**
 * Create an empty ConsensusRow panel (hidden by default).
 * Attach to the DOM; call `renderConsensusRow` to populate it.
 */
export function createConsensusRow(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'consensus-row hidden'
  el.hidden = true
  el.setAttribute('role', 'region')
  el.setAttribute('aria-label', 'Multi-trace consensus')
  el.setAttribute('data-testid', 'consensus-row')
  return el
}

/**
 * Populate the consensus row with the given result.
 *
 * @param el        The element returned by createConsensusRow().
 * @param result    Output of computeConsensus().
 * @param fileNames Ordered list of file names for the FASTA header + summary.
 * @param anchor    0-based index to centre the view window on (default 0).
 */
export function renderConsensusRow(
  el: HTMLDivElement,
  result: ConsensusResult,
  fileNames: string[],
  anchor = 0,
): void {
  el.classList.remove('hidden')
  el.hidden = false

  // Build summary.
  const summaryEl = document.createElement('div')
  summaryEl.className = 'consensus-row__summary'
  summaryEl.setAttribute('data-testid', 'consensus-summary')
  const mCount = result.mismatchCount
  if (result.length === 0) {
    summaryEl.textContent = 'No consensus — load at least 2 traces'
  } else {
    const traceWord = fileNames.length === 1 ? 'trace' : 'traces'
    summaryEl.textContent =
      `Consensus of ${fileNames.length} ${traceWord} · ` +
      `${result.length} bp · ` +
      `${mCount} mismatch${mCount === 1 ? '' : 'es'}`
  }

  // Build windowed sequence.
  const seqEl = document.createElement('div')
  seqEl.className = 'consensus-row__seq'
  seqEl.setAttribute('aria-label', 'Consensus sequence')

  if (result.length > 0) {
    const mismatchSet = new Set(result.mismatches)
    // Centre the window on the anchor, clamped to valid range.
    const halfWin = Math.floor(WINDOW / 2)
    const start = Math.max(0, Math.min(anchor - halfWin, result.length - WINDOW))
    const end = Math.min(result.length, start + WINDOW)

    for (let i = start; i < end; i++) {
      const span = document.createElement('span')
      span.className = 'consensus-base'
      span.textContent = result.sequence[i]
      span.setAttribute('data-pos', String(i + 1))  // 1-based for humans

      if (mismatchSet.has(i)) {
        span.classList.add('consensus-base--mismatch')
        span.setAttribute('aria-label', `position ${i + 1}: mismatch ${result.sequence[i]}`)
      }

      seqEl.append(span)
    }
  }

  el.replaceChildren(summaryEl, seqEl)
}

/**
 * Hide the consensus row and clear its content.
 */
export function hideConsensusRow(el: HTMLDivElement): void {
  el.classList.add('hidden')
  el.hidden = true
  el.replaceChildren()
}
