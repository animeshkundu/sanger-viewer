import type { TraceMetadata } from '../types/trace'

export function createMetadataPanel(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'metadata-panel hidden'
  el.setAttribute('aria-label', 'Trace metadata')
  el.setAttribute('data-testid', 'metadata-panel')
  return el
}

function row(label: string, value: string): string {
  return `<div class="metadata-row"><span class="metadata-label">${label}</span><span class="metadata-value">${value}</span></div>`
}

export function updateMetadataPanel(el: HTMLDivElement, metadata: TraceMetadata | null): void {
  if (!metadata) {
    el.classList.add('hidden')
    el.innerHTML = ''
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
    el.innerHTML = ''
    return
  }

  el.innerHTML = `
    <div class="metadata-header">Trace info</div>
    <div class="metadata-rows">
      ${present.map(([label, value]) => row(label, String(value))).join('')}
    </div>
  `
  el.classList.remove('hidden')
}
