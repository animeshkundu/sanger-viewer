import { parseTrace } from '../parsers'
import { ChromatogramCanvas } from '../render/ChromatogramCanvas'
import { createControls } from './Controls'
import { createTooltip, hideTooltip, showTooltip } from './Tooltip'
import { createSequencePanel, renderSequence } from './SequencePanel'
import { createPositionReadout, updatePositionReadout } from './PositionReadout'
import { downloadBlob } from '../export/png'
import { toFasta } from '../export/fasta'

interface ActivePointer {
  clientX: number
  clientY: number
  startX: number
  startY: number
  moved: boolean
}

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
  const activePointers = new Map<number, ActivePointer>()
  const tapSlop = 8
  let hadMultiTouch = false

  const refreshReadout = () => {
    const vp = renderer.getViewportInfo()
    updatePositionReadout(readout, vp.start, vp.end)
  }

  const selectBaseAt = (clientX: number, clientY: number) => {
    const hit = renderer.hitTest(clientX)
    if (!hit) {
      hideTooltip(tooltip)
      return
    }

    showTooltip(tooltip, hit, clientX, clientY)
    const trace = renderer.getCurrentTrace()
    if (trace) renderSequence(sequencePanel, trace, hit.index)
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

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointer events used in tests do not create browser-managed capture state.
    }
    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    })

    if (activePointers.size > 1) hadMultiTouch = true
  })

  canvas.addEventListener('pointermove', (event) => {
    const pointer = activePointers.get(event.pointerId)
    if (!pointer) return

    const previousX = pointer.clientX
    const previousY = pointer.clientY
    const moved = pointer.moved || Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > tapSlop
    activePointers.set(event.pointerId, {
      ...pointer,
      clientX: event.clientX,
      clientY: event.clientY,
      moved
    })

    if (activePointers.size === 1) {
      if (event.pointerType !== 'mouse' && !moved) return
      hideTooltip(tooltip)
      renderer.panPixels(previousX - event.clientX)
      refreshReadout()
      return
    }

    if (activePointers.size !== 2) return

    hadMultiTouch = true
    hideTooltip(tooltip)
    const pointers = Array.from(activePointers.entries())
    const previous = pointers.map(([pointerId, value]) =>
      pointerId === event.pointerId ? { clientX: previousX, clientY: previousY } : { clientX: value.clientX, clientY: value.clientY }
    )
    const current = pointers.map(([, value]) => ({ clientX: value.clientX, clientY: value.clientY }))
    const previousDistance = Math.hypot(previous[0].clientX - previous[1].clientX, previous[0].clientY - previous[1].clientY)
    const currentDistance = Math.hypot(current[0].clientX - current[1].clientX, current[0].clientY - current[1].clientY)

    if (previousDistance < 1 || currentDistance < 1) return

    const rect = canvas.getBoundingClientRect()
    const centerX = (current[0].clientX + current[1].clientX) / 2 - rect.left
    renderer.zoom(previousDistance / currentDistance, centerX)
    refreshReadout()
  })

  const stopPointer = (event: PointerEvent) => {
    const pointer = activePointers.get(event.pointerId)
    if (!pointer) return

    const isTap = activePointers.size === 1 && event.pointerType !== 'mouse' && !pointer.moved && !hadMultiTouch
    activePointers.delete(event.pointerId)
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    if (activePointers.size === 0) hadMultiTouch = false

    if (isTap) selectBaseAt(event.clientX, event.clientY)
  }

  canvas.addEventListener('pointerup', stopPointer)
  canvas.addEventListener('pointercancel', stopPointer)

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 0.9 : 1.1
    renderer.zoom(factor, event.offsetX)
    refreshReadout()
  })

  canvas.addEventListener('click', (event) => {
    selectBaseAt(event.clientX, event.clientY)
  })

  canvas.addEventListener('mousemove', (event) => {
    selectBaseAt(event.clientX, event.clientY)
  })

  canvas.addEventListener('mouseleave', () => hideTooltip(tooltip))

  return root
}
