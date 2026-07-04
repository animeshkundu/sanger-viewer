import type { TraceData } from '../types/trace'
import type { TrimResult } from '../quality/mottTrim'
import type { SubsequenceMatch } from '../search/findSubsequence'

interface RenderSequenceOptions {
  selectedIndex?: number
  anchorIndex?: number
  trim?: TrimResult | null
  mode?: 'full' | 'trimmed'
  matches?: SubsequenceMatch[]
  activeMatchIndex?: number
  ambiguousIndices?: number[]
  editedIndices?: Set<number>
  editingIndex?: number
}

export function createSequencePanel(): HTMLDivElement {
  const panel = document.createElement('div')
  panel.className = 'sequence-panel'
  panel.textContent = 'Load a trace to inspect sequence'
  return panel
}

/**
 * Render the sequence panel.
 *
 * When trim is provided and mode === 'trimmed' and status === 'ok':
 *   - A ±120-base window around the selected base (clamped to kept region) is shown.
 *   - When no base is selected, a ~240-base window anchored at trimStart is shown
 *     to avoid rendering thousands of spans for long reads on initial load.
 *   - Bases outside the kept region are omitted entirely.
 * When mode === 'full' (or trim is absent):
 *   - The ±120-base window around the selected/hovered base is shown as before.
 *   - Trimmed end-bases are visually marked with a .trimmed-base class so the user
 *     can see which bases fall outside the quality window.
 */
export function renderSequence(
  panel: HTMLElement,
  trace: TraceData,
  {
    selectedIndex = -1,
    anchorIndex = -1,
    trim = null,
    mode = 'full',
    matches = [],
    activeMatchIndex = -1,
    ambiguousIndices = [],
    editedIndices,
    editingIndex = -1,
  }: RenderSequenceOptions = {},
): void {
  const ambiguousSet = new Set(ambiguousIndices)
  let ambiguousVisibleCount = 0

  const inTrimmedMode = mode === 'trimmed' && trim !== null && trim.status === 'ok'
  const allTrimmedInTrimmedMode = mode === 'trimmed' && trim !== null && trim.status === 'all-trimmed'

  if (allTrimmedInTrimmedMode) {
    const emptyState = document.createElement('div')
    emptyState.className = 'sequence-empty-state'
    emptyState.setAttribute('role', 'status')
    emptyState.setAttribute('aria-live', 'polite')
    emptyState.textContent = 'All bases trimmed at this threshold.'
    panel.appendChild(emptyState)
    return
  }

  const anchor = anchorIndex >= 0 ? anchorIndex : selectedIndex
  const activeMatch = activeMatchIndex >= 0 ? matches[activeMatchIndex] ?? null : null
  const getWindowMatches = (start: number, end: number) => matches.filter((match) => match.end > start && match.start < end)
  const applySpanClasses = (span: HTMLSpanElement, absolute: number, visibleMatches: SubsequenceMatch[]) => {
    const classes: string[] = []
    let hasPassiveMatch = false
    let hasActiveMatch = false
    for (const match of visibleMatches) {
      if (absolute < match.start || absolute >= match.end) continue
      hasPassiveMatch = true
      if (activeMatch && match === activeMatch) hasActiveMatch = true
    }
    if (absolute === selectedIndex) classes.push('selected-base')
    if (hasPassiveMatch) {
      classes.push('search-match')
      span.dataset.searchMatch = 'true'
    }
    if (hasActiveMatch) {
      classes.push('search-match--active')
      span.dataset.searchActive = 'true'
    }
    if (trim && trim.status === 'ok' && mode === 'full') {
      if (absolute < trim.trimStart || absolute >= trim.trimEnd) classes.push('trimmed-base')
    }
    if (ambiguousSet.has(absolute)) {
      classes.push('ambiguous-base')
      span.dataset.ambiguous = 'true'
      ambiguousVisibleCount += 1
    }
    if (editedIndices?.has(absolute)) {
      classes.push('edited-base')
      span.dataset.edited = 'true'
    }
    if (absolute === editingIndex) {
      classes.push('editing')
    }
    if (classes.length) span.className = classes.join(' ')
  }

  const buildSpan = (base: string, absolute: number, visibleMatches: SubsequenceMatch[]) => {
    const span = document.createElement('span')
    updateSpan(span, base, absolute, visibleMatches)
    return span
  }

  const updateSpan = (span: HTMLSpanElement, base: string, absolute: number, visibleMatches: SubsequenceMatch[]) => {
    span.textContent = base
    span.tabIndex = absolute === selectedIndex ? 0 : -1
    span.setAttribute('role', 'button')
    span.setAttribute('aria-haspopup', 'dialog')
    span.setAttribute('aria-expanded', 'false')
    span.setAttribute('aria-label', `${base} at position ${absolute + 1}${editedIndices?.has(absolute) ? ' (edited)' : ''}`)
    span.dataset.baseIndex = String(absolute)
    delete span.dataset.searchMatch
    delete span.dataset.searchActive
    delete span.dataset.ambiguous
    delete span.dataset.edited
    span.className = ''
    applySpanClasses(span, absolute, visibleMatches)
  }

  const renderWindow = (start: number, end: number, visibleMatches: SubsequenceMatch[]) => {
    const existingSpans =
      panel.children.length === end - start
        ? [...panel.querySelectorAll<HTMLSpanElement>('span[data-base-index]')]
        : []
    const canPatchInPlace =
      existingSpans.length === end - start &&
      existingSpans.every((span, idx) => Number(span.dataset.baseIndex) === start + idx)

    if (canPatchInPlace) {
      for (let idx = 0; idx < existingSpans.length; idx += 1) {
        const absolute = start + idx
        updateSpan(existingSpans[idx], trace.baseCalls[absolute] ?? 'N', absolute, visibleMatches)
      }
      return
    }

    panel.innerHTML = ''
    const fragment = document.createDocumentFragment()
    trace.baseCalls.slice(start, end).forEach((base, idx) => {
      const absolute = start + idx
      fragment.appendChild(buildSpan(base, absolute, visibleMatches))
    })
    panel.appendChild(fragment)
  }

  if (inTrimmedMode) {
    // Show only the kept window; centre selection within it.
    // When no base is selected, anchor at trimStart and cap at trimStart+240 to avoid
    // rendering thousands of spans for long reads (same ~240-base budget as full mode).
    const { trimStart, trimEnd } = trim
    const windowStart = anchor >= 0 ? Math.max(trimStart, anchor - 120) : trimStart
    const windowEnd = anchor >= 0 ? Math.min(trimEnd, anchor + 120) : Math.min(trimEnd, trimStart + 240)
    const visibleMatches = getWindowMatches(windowStart, windowEnd)
    renderWindow(windowStart, windowEnd, visibleMatches)
  } else {
    // Full mode: ±120 around selected, but mark trimmed bases.
    const start = anchor >= 0 ? Math.max(0, anchor - 120) : 0
    const end = anchor >= 0 ? Math.min(trace.baseCalls.length, anchor + 120) : Math.min(trace.baseCalls.length, 240)
    const visibleMatches = getWindowMatches(start, end)
    renderWindow(start, end, visibleMatches)
  }

  panel.setAttribute('data-ambiguous-visible-count', String(ambiguousVisibleCount))

  // Roving tabindex: ensure at least one span is in the Tab sequence when no base is selected.
  if (!panel.querySelector('span[tabindex="0"]')) {
    const first = panel.querySelector<HTMLSpanElement>('span[data-base-index]')
    if (first) first.tabIndex = 0
  }
}
