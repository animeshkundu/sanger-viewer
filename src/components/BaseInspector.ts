import type { TraceData } from '../types/trace'

export interface BaseInspectorInfo {
  index: number
  position: number
  base: string
  quality: number | null
  peakAmplitude: number
  peakSample: number
  ariaLabel: string
}

const isNucleotide = (base: string): base is 'A' | 'C' | 'G' | 'T' =>
  base === 'A' || base === 'C' || base === 'G' || base === 'T'

export function getPeakAmplitude(trace: TraceData, index: number): number {
  const peakSample = trace.peakPositions[index]
  if (peakSample === undefined) return 0
  const base = (trace.baseCalls[index] ?? 'N').toUpperCase()
  if (isNucleotide(base)) return Math.round(trace.channels[base][peakSample] ?? 0)
  return Math.round(
    Math.max(
      trace.channels.A[peakSample] ?? 0,
      trace.channels.C[peakSample] ?? 0,
      trace.channels.G[peakSample] ?? 0,
      trace.channels.T[peakSample] ?? 0,
    ),
  )
}

export function getBaseInspectorInfo(trace: TraceData, index: number): BaseInspectorInfo | null {
  const base = trace.baseCalls[index]
  const peakSample = trace.peakPositions[index]
  if (base === undefined || peakSample === undefined) return null
  const position = index + 1
  const quality = trace.qualities?.[index] ?? null
  const peakAmplitude = getPeakAmplitude(trace, index)
  const qualityText = quality ?? 'n/a'
  return {
    index,
    position,
    base,
    quality,
    peakAmplitude,
    peakSample,
    ariaLabel: `Base inspector: position ${position}, base ${base}, PHRED ${qualityText}, peak amplitude ${peakAmplitude}`,
  }
}

export function createBaseInspector(): HTMLDivElement {
  const el = document.createElement('div')
  el.id = 'base-inspector'
  el.className = 'base-inspector hidden'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Base inspector')
  el.innerHTML = `
    <p class="base-inspector__title">Base inspector</p>
    <dl class="base-inspector__grid">
      <dt>Position</dt><dd data-field="position">-</dd>
      <dt>Base</dt><dd data-field="base">-</dd>
      <dt>PHRED</dt><dd data-field="quality">-</dd>
      <dt>Peak amplitude</dt><dd data-field="peak-amplitude">-</dd>
    </dl>
  `
  return el
}

export function showBaseInspector(el: HTMLElement, info: BaseInspectorInfo): void {
  el.classList.remove('hidden')
  el.setAttribute('aria-label', info.ariaLabel)
  el.setAttribute('data-base-index', String(info.index))
  const setField = (field: string, value: string) => {
    const target = el.querySelector<HTMLElement>(`[data-field="${field}"]`)
    if (target) target.textContent = value
  }
  setField('position', String(info.position))
  setField('base', info.base)
  setField('quality', String(info.quality ?? 'n/a'))
  setField('peak-amplitude', String(info.peakAmplitude))
}

export function hideBaseInspector(el: HTMLElement): void {
  el.classList.add('hidden')
  el.removeAttribute('data-base-index')
}
