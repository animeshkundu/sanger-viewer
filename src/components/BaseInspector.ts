export interface BaseInspectorInfo {
  index: number
  base: string
  quality: number | null
  peakAmplitude: number
}

export function createBaseInspector(): HTMLDivElement {
  const el = document.createElement('div')
  el.id = 'base-inspector'
  el.className = 'base-inspector hidden'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Base inspector')
  el.innerHTML = `
    <h2 class="base-inspector__title">Base inspector</h2>
    <dl class="base-inspector__list">
      <div class="base-inspector__row"><dt>Position</dt><dd data-testid="base-inspector-position"></dd></div>
      <div class="base-inspector__row"><dt>Base</dt><dd data-testid="base-inspector-base"></dd></div>
      <div class="base-inspector__row"><dt>PHRED</dt><dd data-testid="base-inspector-quality"></dd></div>
      <div class="base-inspector__row"><dt>Peak amplitude</dt><dd data-testid="base-inspector-peak"></dd></div>
    </dl>
  `
  return el
}

export function showBaseInspector(el: HTMLElement, info: BaseInspectorInfo): void {
  el.classList.remove('hidden')
  const position = el.querySelector<HTMLElement>('[data-testid="base-inspector-position"]')
  const base = el.querySelector<HTMLElement>('[data-testid="base-inspector-base"]')
  const quality = el.querySelector<HTMLElement>('[data-testid="base-inspector-quality"]')
  const peak = el.querySelector<HTMLElement>('[data-testid="base-inspector-peak"]')
  if (position) position.textContent = String(info.index + 1)
  if (base) base.textContent = info.base
  if (quality) quality.textContent = info.quality === null ? 'n/a' : String(info.quality)
  if (peak) peak.textContent = String(info.peakAmplitude)
}

export function hideBaseInspector(el: HTMLElement): void {
  el.classList.add('hidden')
}
