/**
 * CloneScreenPanel — DOM component for the multi-trace synchronized stacked viewer.
 *
 * Shows N trace base-call sequences stacked vertically with:
 *   - A synchronized cursor column (keyboard-navigable with Left/Right/Home/End)
 *   - Per-column agreement (teal) / mismatch (amber) highlighting
 *   - Jump-to-next/prev-mismatch buttons
 *   - "Copy mismatch report" export to clipboard (TSV)
 *   - Full light + dark theme via CSS custom properties
 *   - Accessible: role="region", row labels, keyboard-operable cursor
 *
 * Interaction contract:
 *   - `onCursorChange(position)` is called whenever the cursor moves; TraceViewer
 *     uses this to scroll the active chromatogram to the focused base.
 *   - `renderCloneScreen()` must be called to populate and show the panel.
 *   - `hideCloneScreen()` hides and resets the panel.
 *
 * All state is in-memory; no server calls; client-side only (privacy-safe).
 */

import { computeStackedView, nextMismatch, prevMismatch, clampCursor, buildMismatchReport } from '../cloneScreen/stackedViewer'
import type { StackedViewResult } from '../cloneScreen/stackedViewer'

/** How many columns to show in the window around the cursor. */
const WINDOW = 60
/** How many columns to label in the ruler (every N). */
const RULER_STEP = 10

export interface CloneScreenPanelElements {
  root: HTMLElement
  /** Called with the new 0-based cursor position whenever it changes. */
  onCursorChange: (pos: number) => void
  /** Internal state — mutable. */
  _state: {
    result: StackedViewResult | null
    fileNames: string[]
    cursorPos: number
  }
}

/**
 * Create an empty CloneScreenPanel element (hidden by default).
 *
 * @param onCursorChange  Callback fired when the cursor position changes.
 */
export function createCloneScreenPanel(
  onCursorChange: (pos: number) => void,
): CloneScreenPanelElements {
  const root = document.createElement('section')
  root.className = 'clone-screen hidden'
  root.hidden = true
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Clone screen — stacked trace comparison')
  root.setAttribute('data-testid', 'clone-screen-panel')
  root.setAttribute('tabindex', '0')

  const elements: CloneScreenPanelElements = {
    root,
    onCursorChange,
    _state: { result: null, fileNames: [], cursorPos: 0 },
  }

  // Wire root-level event handlers ONCE so they never accumulate across repaints.
  // Button-specific handlers are attached to freshly-created button elements in
  // _paint() and are naturally discarded by replaceChildren() on each repaint.

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const posStr = target.getAttribute('data-pos')
    if (posStr !== null && target.classList.contains('clone-screen__base')) {
      _moveCursor(elements, Number(posStr))
    }
  })

  root.addEventListener('keydown', (e) => {
    const { result, cursorPos } = elements._state
    if (!result) return
    const { mismatchIndices, length } = result
    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault()
        _moveCursor(elements, cursorPos - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        _moveCursor(elements, cursorPos + 1)
        break
      case 'BracketLeft': {
        e.preventDefault()
        const p = prevMismatch(mismatchIndices, cursorPos)
        if (p !== null) _moveCursor(elements, p)
        break
      }
      case 'BracketRight': {
        e.preventDefault()
        const n = nextMismatch(mismatchIndices, cursorPos)
        if (n !== null) _moveCursor(elements, n)
        break
      }
      case 'Home':
        e.preventDefault()
        _moveCursor(elements, mismatchIndices.length > 0 ? mismatchIndices[0] : 0)
        break
      case 'End':
        e.preventDefault()
        _moveCursor(elements, mismatchIndices.length > 0 ? mismatchIndices[mismatchIndices.length - 1] : length - 1)
        break
      default:
        break
    }
  })

  return elements
}

/**
 * Move the cursor to newPos, clamping to valid range.
 * Reads state dynamically so it is safe to call from handlers wired once.
 */
function _moveCursor(elements: CloneScreenPanelElements, newPos: number): void {
  const { result } = elements._state
  if (!result) return
  const clamped = clampCursor(newPos, result.length)
  if (clamped === elements._state.cursorPos) return
  elements._state.cursorPos = clamped
  elements.onCursorChange(clamped)
  _paint(elements)
}

// ── Rendering ──────────────────────────────────────────────────────────────────

/**
 * Populate and show the clone screen panel.
 *
 * @param elements   Panel created by createCloneScreenPanel().
 * @param sequences  Ordered sequence strings for each loaded trace.
 * @param fileNames  Ordered file names matching sequences.
 * @param cursorPos  Optional cursor position to jump to (0-based). Defaults to
 *                   the panel's last cursor position (or 0 on first call).
 */
export function renderCloneScreen(
  elements: CloneScreenPanelElements,
  sequences: string[],
  fileNames: string[],
  cursorPos?: number,
): void {
  const result = computeStackedView(sequences)
  elements._state.result = result
  elements._state.fileNames = fileNames
  if (cursorPos !== undefined) {
    elements._state.cursorPos = clampCursor(cursorPos, result.length)
  } else {
    elements._state.cursorPos = clampCursor(elements._state.cursorPos, result.length)
  }

  _paint(elements)

  elements.root.classList.remove('hidden')
  elements.root.hidden = false
}

/** Hide the panel and clear its content. */
export function hideCloneScreen(elements: CloneScreenPanelElements): void {
  elements.root.classList.add('hidden')
  elements.root.hidden = true
  elements.root.replaceChildren()
  elements._state.result = null
  elements._state.fileNames = []
  elements._state.cursorPos = 0
}

// ── Internal paint ─────────────────────────────────────────────────────────────

function _paint(elements: CloneScreenPanelElements): void {
  const { result, fileNames, cursorPos } = elements._state
  if (!result || result.length === 0) return

  const { columns, mismatchIndices, traceCount, length } = result
  const mCount = mismatchIndices.length

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = document.createElement('div')
  header.className = 'clone-screen__header'

  const summary = document.createElement('span')
  summary.className = 'clone-screen__summary'
  summary.setAttribute('data-testid', 'clone-screen-summary')
  summary.textContent =
    `Clone screen · ${traceCount} trace${traceCount === 1 ? '' : 's'} · ` +
    `${length} bp · ` +
    `${mCount} mismatch${mCount === 1 ? '' : 'es'}`

  const nav = document.createElement('div')
  nav.className = 'clone-screen__nav'
  nav.setAttribute('role', 'toolbar')
  nav.setAttribute('aria-label', 'Mismatch navigation')

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.className = 'clone-screen__nav-btn'
  prevBtn.setAttribute('data-testid', 'clone-screen-prev-mismatch')
  prevBtn.setAttribute('aria-label', 'Jump to previous mismatch')
  prevBtn.textContent = '← Prev mismatch'
  prevBtn.disabled = mCount === 0

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = 'clone-screen__nav-btn'
  nextBtn.setAttribute('data-testid', 'clone-screen-next-mismatch')
  nextBtn.setAttribute('aria-label', 'Jump to next mismatch')
  nextBtn.textContent = 'Next mismatch →'
  nextBtn.disabled = mCount === 0

  const exportBtn = document.createElement('button')
  exportBtn.type = 'button'
  exportBtn.className = 'clone-screen__nav-btn'
  exportBtn.setAttribute('data-testid', 'clone-screen-copy-report')
  exportBtn.setAttribute('aria-label', 'Copy mismatch report to clipboard (tab-separated)')
  exportBtn.textContent = 'Copy report'
  exportBtn.disabled = mCount === 0

  // Button handlers are safe to attach here — each paint creates fresh button
  // elements and replaceChildren() below discards the previous ones with theirs.
  prevBtn.addEventListener('click', () => {
    const p = prevMismatch(elements._state.result?.mismatchIndices ?? [], elements._state.cursorPos)
    if (p !== null) _moveCursor(elements, p)
  })
  nextBtn.addEventListener('click', () => {
    const n = nextMismatch(elements._state.result?.mismatchIndices ?? [], elements._state.cursorPos)
    if (n !== null) _moveCursor(elements, n)
  })
  exportBtn.addEventListener('click', () => {
    const { result: r, fileNames: fn } = elements._state
    if (!r) return
    const report = buildMismatchReport(r, fn)
    if (!report) return
    void (async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(report)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = report
          textarea.style.cssText = 'position:fixed;opacity:0'
          document.body.appendChild(textarea)
          textarea.focus()
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        exportBtn.textContent = 'Copied!'
        setTimeout(() => { exportBtn.textContent = 'Copy report' }, 2000)
      } catch {
        exportBtn.textContent = 'Copy failed'
        setTimeout(() => { exportBtn.textContent = 'Copy report' }, 2000)
      }
    })()
  })

  nav.append(prevBtn, nextBtn, exportBtn)
  header.append(summary, nav)

  // ── Cursor position display ──────────────────────────────────────────────────
  const cursorInfo = document.createElement('div')
  cursorInfo.className = 'clone-screen__cursor-info'
  cursorInfo.setAttribute('aria-live', 'polite')
  cursorInfo.setAttribute('aria-atomic', 'true')
  cursorInfo.setAttribute('data-testid', 'clone-screen-cursor-info')
  _updateCursorInfo(cursorInfo, cursorPos, columns[cursorPos]?.bases ?? [], fileNames)

  // ── Window calculation ───────────────────────────────────────────────────────
  const halfWin = Math.floor(WINDOW / 2)
  const winStart = Math.max(0, Math.min(cursorPos - halfWin, length - WINDOW))
  const winEnd = Math.min(length, winStart + WINDOW)

  // ── Sequence grid ────────────────────────────────────────────────────────────
  const grid = document.createElement('div')
  grid.className = 'clone-screen__grid'
  // grid-template-columns: label column + one column per base in window
  // Use CSS grid with fixed-width monospace columns.

  // Ruler row
  const rulerRow = document.createElement('div')
  rulerRow.className = 'clone-screen__row clone-screen__row--ruler'
  rulerRow.setAttribute('aria-hidden', 'true')

  const rulerLabel = document.createElement('span')
  rulerLabel.className = 'clone-screen__label'
  rulerRow.appendChild(rulerLabel)

  const rulerBases = document.createElement('div')
  rulerBases.className = 'clone-screen__bases clone-screen__bases--ruler'
  for (let i = winStart; i < winEnd; i++) {
    const cell = document.createElement('span')
    cell.className = 'clone-screen__ruler-cell'
    if ((i + 1) % RULER_STEP === 0 || i === winStart || i === winEnd - 1) {
      cell.textContent = String(i + 1)
      cell.setAttribute('data-pos', String(i + 1))
    }
    if (i === cursorPos) cell.classList.add('clone-screen__ruler-cell--cursor')
    rulerBases.appendChild(cell)
  }
  rulerRow.appendChild(rulerBases)
  grid.appendChild(rulerRow)

  // Per-trace rows
  for (let t = 0; t < traceCount; t++) {
    const row = document.createElement('div')
    row.className = 'clone-screen__row'
    row.setAttribute('role', 'row')
    row.setAttribute('aria-label', `Trace ${t + 1}: ${fileNames[t] ?? `trace ${t + 1}`}`)
    row.setAttribute('data-testid', `clone-screen-row-${t}`)

    const label = document.createElement('span')
    label.className = 'clone-screen__label'
    label.title = fileNames[t] ?? ''
    // Truncate long file names for display
    const name = fileNames[t] ?? `Trace ${t + 1}`
    label.textContent = name.length > 18 ? name.slice(0, 16) + '…' : name
    label.setAttribute('aria-hidden', 'true')
    row.appendChild(label)

    const bases = document.createElement('div')
    bases.className = 'clone-screen__bases'
    for (let i = winStart; i < winEnd; i++) {
      const col = columns[i]
      const base = col.bases[t] ?? '?'
      const cell = document.createElement('span')
      cell.className = 'clone-screen__base'
      cell.textContent = base
      cell.setAttribute('data-pos', String(i))
      cell.setAttribute('data-testid', `clone-screen-base-t${t}-p${i}`)
      if (col.allAgree) {
        cell.classList.add('clone-screen__base--agree')
      } else {
        cell.classList.add('clone-screen__base--mismatch')
      }
      if (i === cursorPos) {
        cell.classList.add('clone-screen__base--cursor')
      }
      bases.appendChild(cell)
    }
    row.appendChild(bases)
    grid.appendChild(row)
  }

  // ── Keyboard hint ────────────────────────────────────────────────────────────
  const hint = document.createElement('p')
  hint.className = 'clone-screen__keyboard-hint'
  hint.setAttribute('aria-hidden', 'true')
  hint.textContent = '← → move cursor · [ ] jump mismatches · Home End first/last mismatch'

  elements.root.replaceChildren(header, cursorInfo, grid, hint)
}

function _updateCursorInfo(
  el: HTMLElement,
  cursorPos: number,
  bases: string[],
  fileNames: string[],
): void {
  const pos1 = cursorPos + 1
  if (bases.length === 0) {
    el.textContent = ''
    return
  }
  const baseParts = bases.map((b, i) => `${fileNames[i] ?? `T${i + 1}`}: ${b}`).join(' · ')
  el.textContent = `Position ${pos1} — ${baseParts}`
}
