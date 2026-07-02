export function createPositionReadout(): HTMLDivElement {
  const readout = document.createElement('div')
  readout.className = 'position-readout'
  readout.textContent = 'Position: -'
  return readout
}

export function updatePositionReadout(el: HTMLElement, start: number, end: number): void {
  el.textContent = `Position: ${start} - ${end}`
}
