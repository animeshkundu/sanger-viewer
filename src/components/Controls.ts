export function createControls(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'controls'
  root.setAttribute('role', 'toolbar')
  root.setAttribute('aria-label', 'Trace viewer controls')
  root.innerHTML = `
    <button data-action="zoom-in">Zoom +</button>
    <button data-action="zoom-out">Zoom -</button>
    <button data-action="pan-left">← Pan</button>
    <button data-action="pan-right">Pan →</button>
    <button data-action="fit">Fit</button>
    <button data-action="toggle-strand" aria-pressed="false" title="Toggle reverse complement strand">5′→3′</button>
    <button data-action="export-png">Export PNG</button>
    <button data-action="export-fasta">Export FASTA</button>
  `
  return root
}

/** Update the strand toggle button to reflect the current strand state. */
export function setStrandToggleState(controls: HTMLDivElement, isRevcomp: boolean): void {
  const btn = controls.querySelector<HTMLButtonElement>('[data-action="toggle-strand"]')
  if (!btn) return
  btn.setAttribute('aria-pressed', String(isRevcomp))
  btn.textContent = isRevcomp ? '3′→5′' : '5′→3′'
  btn.title = isRevcomp ? 'Showing reverse complement — click to show forward strand' : 'Showing forward strand — click to show reverse complement'
}

export function setControlsDisabled(controls: HTMLDivElement, disabled: boolean): void {
  controls.querySelectorAll('button').forEach((btn) => {
    ;(btn as HTMLButtonElement).disabled = disabled
  })
}
