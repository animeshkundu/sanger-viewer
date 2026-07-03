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
  canvas.style.touchAction = 'none'

  const renderer = new ChromatogramCanvas(canvas)
  const tapMoveThreshold = 8
  const activePointers = new Map<number, { clientX: number; clientY: number; startX: number; startY: number; moved: boolean }>()
  let lastPinchDistance = 0
  let canvasLeft = 0
  let hadMultiTouchGesture = false
  let selectedBaseIndex: number | null = null
  let hoveredBaseIndex: number | null = null

  const refreshReadout = () => {
    const vp = renderer.getViewportInfo()
    updatePositionReadout(readout, vp.start, vp.end)
  }

  const refreshSequence = () => {
    const trace = renderer.getCurrentTrace()
    if (!trace) return
    renderSequence(sequencePanel, trace, hoveredBaseIndex ?? selectedBaseIndex ?? -1)
  }

  const inspectBase = (clientX: number, clientY: number, select = false) => {
    const hit = renderer.hitTest(clientX)
    if (!hit) {
      if (!select) {
        hoveredBaseIndex = null
        hideTooltip(tooltip)
        refreshSequence()
      }
      return
    }

    showTooltip(tooltip, hit, clientX, clientY)
    if (select) {
      selectedBaseIndex = hit.index
      hoveredBaseIndex = null
    } else {
      hoveredBaseIndex = hit.index
    }
    refreshSequence()
  }

  const getPointerDistance = () => {
    const [first, second] = [...activePointers.values()]
    if (!first || !second) return 0
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
  }

  const releasePointer = (pointerId: number) => {
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId)
  }

  const cacheCanvasOffset = () => {
    canvasLeft = canvas.getBoundingClientRect().left
  }

  const load = async (file: File) => {
    try {
      status.textContent = `Loading ${file.name}...`
      const buffer = await file.arrayBuffer()
      const trace = parseTrace(buffer, file.name)
      selectedBaseIndex = null
      hoveredBaseIndex = null
      hideTooltip(tooltip)
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

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 0.9 : 1.1
    renderer.zoom(factor, event.offsetX)
    refreshReadout()
  })

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    if (event.pointerType !== 'mouse') event.preventDefault()
    cacheCanvasOffset()
    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    })
    canvas.setPointerCapture?.(event.pointerId)
    if (activePointers.size > 1) {
      hadMultiTouchGesture = true
      lastPinchDistance = getPointerDistance()
    }
  })

  canvas.addEventListener('pointermove', (event) => {
    const pointer = activePointers.get(event.pointerId)
    if (pointer) {
      if (event.pointerType !== 'mouse') event.preventDefault()
      activePointers.set(event.pointerId, {
        ...pointer,
        clientX: event.clientX,
        clientY: event.clientY,
        moved:
          pointer.moved ||
          Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) >= tapMoveThreshold
      })

      if (activePointers.size === 1) {
        renderer.panPixels(pointer.clientX - event.clientX)
        refreshReadout()
        return
      }
      if (activePointers.size === 2) {
        const currentDistance = getPointerDistance()
        const [first, second] = [...activePointers.values()]
        if (!first || !second || currentDistance === 0) return
        const centerX = (first.clientX + second.clientX) / 2 - canvasLeft
        if (lastPinchDistance > 0) {
          renderer.zoom(lastPinchDistance / currentDistance, centerX)
          refreshReadout()
        }
        lastPinchDistance = currentDistance
        return
      }

      return
    }

    if (event.pointerType === 'mouse') inspectBase(event.clientX, event.clientY)
  })

  const finishPointer = (event: PointerEvent, cancelled = false) => {
    const pointer = activePointers.get(event.pointerId)
    if (!pointer) return
    if (event.pointerType !== 'mouse') event.preventDefault()
    activePointers.delete(event.pointerId)
    releasePointer(event.pointerId)

    if (!cancelled && !hadMultiTouchGesture && !pointer.moved) inspectBase(event.clientX, event.clientY, true)
    if (activePointers.size < 2) lastPinchDistance = 0
    if (activePointers.size === 0) hadMultiTouchGesture = false
  }

  canvas.addEventListener('pointerup', (event) => finishPointer(event))
  canvas.addEventListener('pointercancel', (event) => finishPointer(event, true))
  canvas.addEventListener('lostpointercapture', (event) => {
    activePointers.delete(event.pointerId)
    if (activePointers.size < 2) lastPinchDistance = 0
    if (activePointers.size === 0) hadMultiTouchGesture = false
  })

  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || activePointers.size > 0) return
    hoveredBaseIndex = null
    hideTooltip(tooltip)
    refreshSequence()
  })

  return root
}
