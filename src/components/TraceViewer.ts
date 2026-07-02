import { parseTrace } from '../parsers'
import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import { createControls } from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'

export function createTraceViewer(): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'viewer'
  root.innerHTML = `
    <h1>Sanger Viewer</h1>
    <div class="dropzone" data-testid="dropzone">
      <input type="file" id="file-input" accept=".ab1,.scf" />
      <p>Pick a .ab1/.scf file or drag-and-drop it here.</p>
      <p id="status">No trace loaded.</p>
    </div>
    <div class="canvas-wrap">
      <canvas data-testid="chromatogram-canvas"></canvas>
    </div>
  `

  const controls = createControls()
  const sequencePanel = createSequencePanel()
  const readout = createPositionReadout()
  const tooltip = createTooltip()
  root.append(controls, readout, sequencePanel, tooltip)

  const fileInput = root.querySelector<HTMLInputElement>('#file-input')!
  const status = root.querySelector<HTMLElement>('#status')!
  const dropzone = root.querySelector<HTMLElement>('.dropzone')!
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!

  const renderer = new ChromatogramCanvas(canvas)

  const refreshReadout = () => {
    const vp = renderer.getViewportInfo()
    updatePositionReadout(readout, vp.start, vp.end)
  }

  const load = async (file: File) => {
    try {
      status.textContent = `Loading ${file.name}...`
      const buffer = await file.arrayBuffer()
      const trace = parseTrace(buffer, file.name)
      renderer.setTrace(trace)
      renderSequence(sequencePanel, trace)
      refreshReadout()
      status.textContent = `Loaded ${trace.fileName} (${trace.baseCalls.length} bases)`
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Failed to parse file'
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) void load(file)
  })

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropzone.classList.add('dragging')
  })
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'))
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropzone.classList.remove('dragging')
    const file = event.dataTransfer?.files?.[0]
    if (file) void load(file)
  })

  controls.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement
    const action = target.getAttribute('data-action')
    const trace = renderer.getCurrentTrace()

    if (action === 'zoom-in') renderer.zoom(0.75)
    if (action === 'zoom-out') renderer.zoom(1.25)
    if (action === 'pan-left') renderer.panPixels(-80)
    if (action === 'pan-right') renderer.panPixels(80)
    if (action === 'fit') renderer.fitToScreen()

    if (action === 'export-png') {
      const blob = await renderer.exportPngBlob()
      downloadBlob(blob, `${trace?.fileName ?? 'trace'}-view.png`)
    }
    if (action === 'export-fasta' && trace) {
      const fasta = new Blob([toFasta(trace)], { type: 'text/plain' })
      downloadBlob(fasta, `${trace.fileName.replace(/\.[^.]+$/, '')}.fasta`)
    }
    refreshReadout()
  })

  let dragging = false
  let lastX = 0
  canvas.addEventListener('mousedown', (event) => {
    dragging = true
    lastX = event.clientX
  })
  window.addEventListener('mouseup', () => {
    dragging = false
  })
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return
    renderer.panPixels(lastX - event.clientX)
    lastX = event.clientX
    refreshReadout()
  })

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 0.9 : 1.1
    renderer.zoom(factor, event.offsetX)
    refreshReadout()
  })

  canvas.addEventListener('mousemove', (event) => {
    const hit = renderer.hitTest(event.clientX)
    if (!hit) {
      hideTooltip(tooltip)
      return
    }
    showTooltip(tooltip, hit, event.clientX, event.clientY)
    const trace = renderer.getCurrentTrace()
    if (trace) renderSequence(sequencePanel, trace, hit.index)
  })

  canvas.addEventListener('mouseleave', () => hideTooltip(tooltip))

  return root
}
