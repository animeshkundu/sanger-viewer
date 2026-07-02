import type { TraceData } from '../types/trace'

export function createSequencePanel(): HTMLDivElement {
  const panel = document.createElement('div')
  panel.className = 'sequence-panel'
  panel.textContent = 'Load a trace to inspect sequence'
  return panel
}

export function renderSequence(panel: HTMLElement, trace: TraceData, selected = -1): void {
  panel.innerHTML = ''
  const start = Math.max(0, selected - 120)
  const end = Math.min(trace.baseCalls.length, selected + 120)
  const fragment = document.createDocumentFragment()
  trace.baseCalls.slice(start, end).forEach((base, idx) => {
    const span = document.createElement('span')
    const absolute = start + idx
    span.textContent = base
    if (absolute === selected) span.className = 'selected-base'
    fragment.appendChild(span)
  })
  panel.appendChild(fragment)
}
