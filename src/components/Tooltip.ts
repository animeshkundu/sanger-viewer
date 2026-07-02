import type { BaseHoverInfo } from '../types/trace'

export function createTooltip(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'tooltip hidden'
  return el
}

export function showTooltip(el: HTMLElement, info: BaseHoverInfo, x: number, y: number): void {
  el.classList.remove('hidden')
  el.style.left = `${x + 10}px`
  el.style.top = `${y + 10}px`
  el.textContent = `#${info.index + 1} ${info.base} peak:${info.samplePosition} q:${info.quality ?? 'n/a'}`
}

export function hideTooltip(el: HTMLElement): void {
  el.classList.add('hidden')
}
