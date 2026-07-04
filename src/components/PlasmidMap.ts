import type { AnnotationFeature, BaseRange } from '../annotations'
import { splitCircularRange, toCircularAngles, toLinearRatios, type MapTopology } from '../plasmidMap/layout'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface PlasmidMapModel {
  sequenceLength: number
  features: AnnotationFeature[]
  visibleRange: BaseRange
}

export interface PlasmidMapHandle {
  element: HTMLElement
  render: (model: PlasmidMapModel) => void
  clear: () => void
}

function featureLabel(feature: AnnotationFeature): string {
  if (feature.type === 'restriction') return feature.enzymeName
  const frame = feature.frame > 0 ? `+${feature.frame}` : String(feature.frame)
  return `ORF ${frame}`
}

function featureAriaLabel(feature: AnnotationFeature): string {
  const kind = feature.type === 'restriction' ? `${feature.enzymeName} restriction site` : featureLabel(feature)
  return `${kind}, bases ${feature.start} to ${feature.end}`
}

function polarToPoint(centerX: number, centerY: number, radius: number, angleDegrees: number): { x: number; y: number } {
  const angle = (angleDegrees * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  }
}

function arcPath(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToPoint(centerX, centerY, radius, startAngle)
  const end = polarToPoint(centerX, centerY, radius, endAngle)
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

function overlapsVisibleRange(feature: AnnotationFeature, visibleRange: BaseRange): boolean {
  return feature.end > visibleRange.start && feature.start < visibleRange.end
}

export function createPlasmidMap(onActivate: (feature: AnnotationFeature) => void): PlasmidMapHandle {
  const root = document.createElement('section')
  root.className = 'plasmid-map hidden'
  root.hidden = true
  root.setAttribute('data-testid', 'plasmid-map')
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Sequence map')

  const heading = document.createElement('h2')
  heading.className = 'plasmid-map__title'
  heading.textContent = 'Sequence map'

  const topologyToggle = document.createElement('div')
  topologyToggle.className = 'plasmid-map__toggle'
  topologyToggle.setAttribute('role', 'group')
  topologyToggle.setAttribute('aria-label', 'Map topology')

  const circularBtn = document.createElement('button')
  circularBtn.type = 'button'
  circularBtn.className = 'plasmid-map__toggle-btn'
  circularBtn.textContent = 'Circular'
  circularBtn.dataset.topology = 'circular'

  const linearBtn = document.createElement('button')
  linearBtn.type = 'button'
  linearBtn.className = 'plasmid-map__toggle-btn'
  linearBtn.textContent = 'Linear'
  linearBtn.dataset.topology = 'linear'

  topologyToggle.append(circularBtn, linearBtn)

  const graphic = document.createElement('div')
  graphic.className = 'plasmid-map__graphic'

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.classList.add('plasmid-map__svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  graphic.append(svg)

  const markerLayer = document.createElement('div')
  markerLayer.className = 'plasmid-map__markers'
  graphic.append(markerLayer)

  root.append(heading, topologyToggle, graphic)

  let topology: MapTopology = 'circular'
  let latestModel: PlasmidMapModel | null = null
  let activeFeatureId: string | null = null

  const syncTopologyButtons = () => {
    root.dataset.topology = topology
    circularBtn.setAttribute('aria-pressed', String(topology === 'circular'))
    linearBtn.setAttribute('aria-pressed', String(topology === 'linear'))
  }

  const renderLinear = (model: PlasmidMapModel) => {
    svg.setAttribute('viewBox', '0 0 300 120')
    const range = toLinearRatios(model.visibleRange, model.sequenceLength)
    root.setAttribute('data-visible-range', `${model.visibleRange.start}:${model.visibleRange.end}`)
    root.setAttribute('data-render-mode', 'linear')

    const backbone = document.createElementNS(SVG_NS, 'line')
    backbone.setAttribute('x1', '20')
    backbone.setAttribute('y1', '60')
    backbone.setAttribute('x2', '280')
    backbone.setAttribute('y2', '60')
    backbone.setAttribute('class', 'plasmid-map__backbone')
    svg.append(backbone)

    const visible = document.createElementNS(SVG_NS, 'rect')
    visible.setAttribute('x', String(20 + range.start * 260))
    visible.setAttribute('y', '52')
    visible.setAttribute('width', String(Math.max(1, (range.end - range.start) * 260)))
    visible.setAttribute('height', '16')
    visible.setAttribute('class', 'plasmid-map__visible-range')
    svg.append(visible)

    for (const feature of model.features) {
      const featureRange = toLinearRatios(feature, model.sequenceLength)
      const segment = document.createElementNS(SVG_NS, 'line')
      segment.setAttribute('x1', String(20 + featureRange.start * 260))
      segment.setAttribute('x2', String(20 + featureRange.end * 260))
      segment.setAttribute('y1', feature.type === 'restriction' ? '48' : '72')
      segment.setAttribute('y2', feature.type === 'restriction' ? '48' : '72')
      segment.setAttribute('class', `plasmid-map__segment plasmid-map__segment--${feature.type}`)
      svg.append(segment)
    }
  }

  const renderCircular = (model: PlasmidMapModel) => {
    svg.setAttribute('viewBox', '0 0 300 300')
    root.setAttribute('data-visible-range', `${model.visibleRange.start}:${model.visibleRange.end}`)
    root.setAttribute('data-render-mode', 'circular')

    const backbone = document.createElementNS(SVG_NS, 'circle')
    backbone.setAttribute('cx', '150')
    backbone.setAttribute('cy', '150')
    backbone.setAttribute('r', '108')
    backbone.setAttribute('class', 'plasmid-map__backbone')
    svg.append(backbone)

    for (const segment of splitCircularRange(model.visibleRange, model.sequenceLength)) {
      const angles = toCircularAngles(segment, model.sequenceLength)
      const visible = document.createElementNS(SVG_NS, 'path')
      visible.setAttribute('d', arcPath(150, 150, 108, angles.startAngle, angles.endAngle))
      visible.setAttribute('class', 'plasmid-map__visible-range')
      svg.append(visible)
    }

    for (const feature of model.features) {
      const angles = toCircularAngles(feature, model.sequenceLength)
      const segment = document.createElementNS(SVG_NS, 'path')
      segment.setAttribute('d', arcPath(150, 150, feature.type === 'restriction' ? 120 : 94, angles.startAngle, angles.endAngle))
      segment.setAttribute('class', `plasmid-map__segment plasmid-map__segment--${feature.type}`)
      svg.append(segment)
    }
  }

  const renderMarkers = (model: PlasmidMapModel) => {
    markerLayer.textContent = ''
    for (const feature of model.features) {
      const marker = document.createElement('button')
      marker.type = 'button'
      marker.className = `plasmid-map__marker plasmid-map__marker--${feature.type}`
      marker.textContent = featureLabel(feature)
      marker.dataset.featureId = feature.id
      marker.dataset.featureType = feature.type
      marker.dataset.start = String(feature.start)
      marker.dataset.end = String(feature.end)
      marker.dataset.inView = String(overlapsVisibleRange(feature, model.visibleRange))
      if (feature.type === 'restriction') {
        marker.dataset.enzyme = feature.enzymeName
      } else {
        marker.dataset.frame = String(feature.frame)
      }
      marker.setAttribute('aria-label', featureAriaLabel(feature))
      marker.setAttribute('aria-current', String(feature.id === activeFeatureId))

      if (topology === 'linear') {
        const ratios = toLinearRatios(feature, model.sequenceLength)
        marker.dataset.position = ratios.mid.toFixed(6)
        marker.style.left = `${8 + ratios.mid * 84}%`
        marker.style.top = feature.type === 'restriction' ? '26%' : '72%'
      } else {
        const angles = toCircularAngles(feature, model.sequenceLength)
        const markerPoint = polarToPoint(50, 50, feature.type === 'restriction' ? 42 : 30, angles.midAngle)
        marker.dataset.position = angles.midAngle.toFixed(3)
        marker.style.left = `${markerPoint.x}%`
        marker.style.top = `${markerPoint.y}%`
      }

      marker.addEventListener('click', () => {
        activeFeatureId = feature.id
        root.setAttribute('data-active-range', `${feature.start}:${feature.end}`)
        onActivate(feature)
        if (latestModel) render(latestModel)
      })
      markerLayer.append(marker)
    }
  }

  const render = (model: PlasmidMapModel) => {
    latestModel = model
    root.classList.remove('hidden')
    root.hidden = false
    root.setAttribute('data-sequence-length', String(model.sequenceLength))
    root.setAttribute('data-feature-count', String(model.features.length))
    syncTopologyButtons()

    svg.textContent = ''
    if (topology === 'linear') renderLinear(model)
    else renderCircular(model)
    renderMarkers(model)
  }

  const clear = () => {
    root.classList.add('hidden')
    root.hidden = true
    root.setAttribute('data-sequence-length', '0')
    root.setAttribute('data-feature-count', '0')
    root.setAttribute('data-visible-range', '0:0')
    root.removeAttribute('data-active-range')
    latestModel = null
    activeFeatureId = null
    svg.textContent = ''
    markerLayer.textContent = ''
  }

  topologyToggle.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.plasmid-map__toggle-btn')
    if (!button) return
    const nextTopology = button.dataset.topology === 'linear' ? 'linear' : 'circular'
    if (nextTopology === topology) return
    topology = nextTopology
    syncTopologyButtons()
    if (latestModel) render(latestModel)
  })

  clear()
  syncTopologyButtons()

  return { element: root, render, clear }
}
