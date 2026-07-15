import type { BaseHoverInfo } from '../types/trace'

export function createTooltip(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'tooltip hidden'
  return el
}

export function showTooltip(el: HTMLElement, info: BaseHoverInfo, x: number, y: number): void {
  el.classList.remove('hidden')
  const { A, C, G, T } = info.amplitudes
  el.textContent = `#${info.index + 1} ${info.base} peak:${info.samplePosition} q:${info.quality ?? 'n/a'} A:${A} C:${C} G:${G} T:${T}`
  const width = el.offsetWidth
  const height = el.offsetHeight

  let left = x + 10
  let top = y + 10
  if (left + width > window.innerWidth) left = x - 10 - width
  if (top + height > window.innerHeight) top = y - 10 - height

  el.style.left = `${Math.max(0, Math.min(left, window.innerWidth - width))}px`
  el.style.top = `${Math.max(0, Math.min(top, window.innerHeight - height))}px`
}

export function hideTooltip(el: HTMLElement): void {
  el.classList.add('hidden')
}
