import type { TraceData } from '../types/trace'
import type { TrimResult } from '../quality/mottTrim'
import type { DisplayRange } from '../search/findSubsequence'

interface SequenceRenderOptions {
  selectedIndex?: number
  focusIndex?: number
  trim?: TrimResult | null
  mode?: 'full' | 'trimmed'
  searchHits?: DisplayRange[]
  activeSearchHit?: DisplayRange | null
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
  options: SequenceRenderOptions = {},
): void {
  const {
    selectedIndex = -1,
    focusIndex = selectedIndex,
    trim = null,
    mode = 'full',
    searchHits = [],
    activeSearchHit = null,
  } = options
  panel.innerHTML = ''
  const fragment = document.createDocumentFragment()
  const searchHitSet = new Set<number>()
  for (const hit of searchHits) {
    for (let index = hit.start; index < hit.end; index += 1) searchHitSet.add(index)
  }

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

  if (inTrimmedMode) {
    // Show only the kept window; centre selection within it.
    // When no base is selected, anchor at trimStart and cap at trimStart+240 to avoid
    // rendering thousands of spans for long reads (same ~240-base budget as full mode).
    const { trimStart, trimEnd } = trim
    const windowStart = focusIndex >= 0 ? Math.max(trimStart, focusIndex - 120) : trimStart
    const windowEnd = focusIndex >= 0 ? Math.min(trimEnd, focusIndex + 120) : Math.min(trimEnd, trimStart + 240)

    trace.baseCalls.slice(windowStart, windowEnd).forEach((base, idx) => {
      const span = document.createElement('span')
      const absolute = windowStart + idx
      span.textContent = base
      const classes: string[] = []
      if (absolute === selectedIndex) classes.push('selected-base')
      if (searchHitSet.has(absolute)) classes.push('search-match')
      if (activeSearchHit && absolute >= activeSearchHit.start && absolute < activeSearchHit.end) classes.push('search-match-active')
      if (classes.length) span.className = classes.join(' ')
      fragment.appendChild(span)
    })
  } else {
    // Full mode: ±120 around selected, but mark trimmed bases.
    const start = Math.max(0, focusIndex - 120)
    const end = Math.min(trace.baseCalls.length, focusIndex + 120)
    trace.baseCalls.slice(start, end).forEach((base, idx) => {
      const span = document.createElement('span')
      const absolute = start + idx
      span.textContent = base
      const classes: string[] = []
      if (absolute === selectedIndex) classes.push('selected-base')
      if (trim && trim.status === 'ok') {
        if (absolute < trim.trimStart || absolute >= trim.trimEnd) classes.push('trimmed-base')
      }
      if (searchHitSet.has(absolute)) classes.push('search-match')
      if (activeSearchHit && absolute >= activeSearchHit.start && absolute < activeSearchHit.end) classes.push('search-match-active')
      if (classes.length) span.className = classes.join(' ')
      fragment.appendChild(span)
    })
  }

  panel.appendChild(fragment)
}
