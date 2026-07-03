import type { TraceData } from '../types/trace'
import type { TrimResult } from '../quality/mottTrim'

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
 *   - Only the kept window [trimStart, trimEnd) is shown.
 *   - Bases outside the window are omitted entirely in trimmed mode.
 * When mode === 'full' (or trim is absent):
 *   - The ±120-base window around the selected/hovered base is shown as before.
 *   - Trimmed end-bases are visually marked with a .trimmed-base class so the user
 *     can see which bases fall outside the quality window.
 */
export function renderSequence(
  panel: HTMLElement,
  trace: TraceData,
  selected = -1,
  trim: TrimResult | null = null,
  mode: 'full' | 'trimmed' = 'full',
): void {
  panel.innerHTML = ''
  const fragment = document.createDocumentFragment()

  const inTrimmedMode = mode === 'trimmed' && trim !== null && trim.status === 'ok'
  const allTrimmedInTrimmedMode = mode === 'trimmed' && trim !== null && trim.status === 'all-trimmed'

  if (allTrimmedInTrimmedMode) {
    const emptyState = document.createElement('div')
    emptyState.textContent = 'All bases trimmed at this threshold.'
    panel.appendChild(emptyState)
    return
  }

  if (inTrimmedMode) {
    // Show only the kept window; centre selection within it.
    const { trimStart, trimEnd } = trim
    const windowStart = Math.max(trimStart, selected >= 0 ? Math.max(trimStart, selected - 120) : trimStart)
    const windowEnd = Math.min(trimEnd, selected >= 0 ? Math.min(trimEnd, selected + 120) : trimEnd)

    trace.baseCalls.slice(windowStart, windowEnd).forEach((base, idx) => {
      const span = document.createElement('span')
      const absolute = windowStart + idx
      span.textContent = base
      if (absolute === selected) span.className = 'selected-base'
      fragment.appendChild(span)
    })
  } else {
    // Full mode: ±120 around selected, but mark trimmed bases.
    const start = Math.max(0, selected - 120)
    const end = Math.min(trace.baseCalls.length, selected + 120)
    trace.baseCalls.slice(start, end).forEach((base, idx) => {
      const span = document.createElement('span')
      const absolute = start + idx
      span.textContent = base
      const classes: string[] = []
      if (absolute === selected) classes.push('selected-base')
      if (trim && trim.status === 'ok') {
        if (absolute < trim.trimStart || absolute >= trim.trimEnd) classes.push('trimmed-base')
      }
      if (classes.length) span.className = classes.join(' ')
      fragment.appendChild(span)
    })
  }

  panel.appendChild(fragment)
}
