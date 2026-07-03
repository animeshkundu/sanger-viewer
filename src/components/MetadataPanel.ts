import type { TraceMetadata } from '../types/trace'

export function createMetadataPanel(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'metadata-panel hidden'
  el.setAttribute('aria-label', 'Trace metadata')
  el.setAttribute('data-testid', 'metadata-panel')
  return el
}

function createRow(label: string, value: string): HTMLDivElement {
  const rowEl = document.createElement('div')
  rowEl.className = 'metadata-row'

  const labelEl = document.createElement('span')
  labelEl.className = 'metadata-label'
  labelEl.textContent = label

  const valueEl = document.createElement('span')
  valueEl.className = 'metadata-value'
  valueEl.textContent = value

  rowEl.appendChild(labelEl)
  rowEl.appendChild(valueEl)
  return rowEl
}

export function updateMetadataPanel(el: HTMLDivElement, metadata: TraceMetadata | null): void {
  if (!metadata) {
    el.classList.add('hidden')
    el.replaceChildren()
    return
  }

  const fields: [string, string | number | undefined][] = [
    ['Sample', metadata.sampleName],
    ['Instrument', metadata.instrument],
    ['Model', metadata.model],
    ['Run date', metadata.runDate],
    ['Dye set', metadata.dyeSet],
    ['Base caller', metadata.baseCaller],
    ['Comment', metadata.comment],
    ['Lane', metadata.lane],
    ['SCF version', metadata.version],
  ]

  const present = fields.filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (present.length === 0) {
    el.classList.add('hidden')
    el.replaceChildren()
    return
  }

  const header = document.createElement('div')
  header.className = 'metadata-header'
  header.textContent = 'Trace info'

  const rowsContainer = document.createElement('div')
  rowsContainer.className = 'metadata-rows'
  for (const [label, value] of present) {
    rowsContainer.appendChild(createRow(label, String(value)))
  }

  el.replaceChildren(header, rowsContainer)
  el.classList.remove('hidden')
}
