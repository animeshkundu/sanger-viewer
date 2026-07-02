export function createControls(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'controls'
  root.innerHTML = `
    <button data-action="zoom-in">Zoom +</button>
    <button data-action="zoom-out">Zoom -</button>
    <button data-action="pan-left">← Pan</button>
    <button data-action="pan-right">Pan →</button>
    <button data-action="fit">Fit</button>
    <button data-action="export-png">Export PNG</button>
    <button data-action="export-fasta">Export FASTA</button>
  `
  return root
}
