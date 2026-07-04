import type { BaseRange, OrfFeature } from '../annotations'
import { splitCircularRange, toLinearRatio } from '../plasmidMap/layout'
import type { RestrictionSitePosition } from '../plasmidMap/restriction'

export type MapTopology = 'circular' | 'linear'

export interface PlasmidMapModel {
  sequenceLength: number
  activeRange: BaseRange
  orfFeatures: OrfFeature[]
  restrictionSites: RestrictionSitePosition[]
}

export interface PlasmidMapActivation {
  start: number
  end: number
}

export interface PlasmidMapHandle {
  element: HTMLElement
  render: (model: PlasmidMapModel) => void
  clear: () => void
}

interface MarkerModel {
  id: string
  type: 'orf' | 'restriction'
  label: string
  start: number
  end: number
  position: number
  strand: '+' | '-'
  wrapsOrigin: boolean
  enzymeName?: string
}

function rangesOverlap(a: BaseRange, b: BaseRange): boolean {
  return a.start < b.end && b.start < a.end
}

function markerOverlapsActiveRange(marker: MarkerModel, activeRange: BaseRange, sequenceLength: number, topology: MapTopology): boolean {
  const markerRange: BaseRange = { start: marker.start, end: marker.end }
  if (topology === 'linear' && !marker.wrapsOrigin) {
    return rangesOverlap(markerRange, activeRange)
  }

  const markerSegments = splitCircularRange(markerRange, sequenceLength)
  const activeSegments = splitCircularRange(activeRange, sequenceLength)

  return markerSegments.some((segment) => activeSegments.some((active) => rangesOverlap(segment, active)))
}

function mapSiteLabel(site: RestrictionSitePosition): string {
  return `${site.enzymeName} ${site.position}`
}

function mapFeatureLabel(feature: OrfFeature): string {
  const frame = feature.frame > 0 ? `+${feature.frame}` : String(feature.frame)
  return `ORF ${frame} ${feature.start + 1}-${feature.end}`
}

export function createPlasmidMap(onActivate: (activation: PlasmidMapActivation) => void): PlasmidMapHandle {
  const root = document.createElement('section')
  root.className = 'plasmid-map hidden'
  root.hidden = true
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Plasmid or linear sequence map')
  root.setAttribute('data-testid', 'plasmid-map')

  const header = document.createElement('div')
  header.className = 'plasmid-map__header'

  const title = document.createElement('h2')
  title.className = 'plasmid-map__title'
  title.textContent = 'Sequence map'

  const controls = document.createElement('div')
  controls.className = 'plasmid-map__controls'

  const circularBtn = document.createElement('button')
  circularBtn.type = 'button'
  circularBtn.className = 'plasmid-map__toggle'
  circularBtn.textContent = 'Circular'

  const linearBtn = document.createElement('button')
  linearBtn.type = 'button'
  linearBtn.className = 'plasmid-map__toggle'
  linearBtn.textContent = 'Linear'

  controls.append(circularBtn, linearBtn)
  header.append(title, controls)

  const body = document.createElement('div')
  body.className = 'plasmid-map__body'

  const circularMap = document.createElement('div')
  circularMap.className = 'plasmid-map__circular'

  const linearMap = document.createElement('div')
  linearMap.className = 'plasmid-map__linear'

  const summary = document.createElement('p')
  summary.className = 'plasmid-map__summary'
  summary.setAttribute('role', 'status')

  body.append(circularMap, linearMap)
  root.append(header, body, summary)

  let topology: MapTopology = 'circular'
  let lastModel: PlasmidMapModel | null = null

  const syncTopologyButtons = () => {
    circularBtn.setAttribute('aria-pressed', String(topology === 'circular'))
    linearBtn.setAttribute('aria-pressed', String(topology === 'linear'))
    root.setAttribute('data-topology', topology)
    root.setAttribute('data-render-mode', topology)
  }

  const setTopology = (next: MapTopology) => {
    if (topology === next) return
    topology = next
    syncTopologyButtons()
    if (lastModel) render(lastModel)
  }

  circularBtn.addEventListener('click', () => setTopology('circular'))
  linearBtn.addEventListener('click', () => setTopology('linear'))

  const clearMapViews = () => {
    circularMap.textContent = ''
    linearMap.textContent = ''
  }

  const render = (model: PlasmidMapModel) => {
    lastModel = model
    if (model.sequenceLength <= 0) {
      clear()
      return
    }

    root.classList.remove('hidden')
    root.hidden = false
    root.setAttribute('data-sequence-length', String(model.sequenceLength))
    root.setAttribute('data-active-range', `${model.activeRange.start + 1}:${model.activeRange.end}`)

    const markers: MarkerModel[] = [
      ...model.orfFeatures.map((feature) => ({
        id: feature.id,
        type: 'orf' as const,
        label: mapFeatureLabel(feature),
        start: feature.start,
        end: feature.end,
        position: feature.start + 1,
        strand: feature.strand,
        wrapsOrigin: feature.end <= feature.start,
      })),
      ...model.restrictionSites.map((site) => ({
        id: site.id,
        type: 'restriction' as const,
        label: mapSiteLabel(site),
        start: site.startIndex,
        end: site.endIndex,
        position: site.position,
        strand: site.strand,
        wrapsOrigin: site.endIndex <= site.startIndex,
        enzymeName: site.enzymeName,
      })),
    ]

    clearMapViews()

    const circularBackbone = document.createElement('div')
    circularBackbone.className = 'plasmid-map__circle-backbone'
    circularMap.append(circularBackbone)

    const circularLayer = document.createElement('div')
    circularLayer.className = 'plasmid-map__circle-markers'
    circularMap.append(circularLayer)

    const linearBackbone = document.createElement('div')
    linearBackbone.className = 'plasmid-map__linear-backbone'
    linearMap.append(linearBackbone)

    const linearActive = document.createElement('div')
    linearActive.className = 'plasmid-map__linear-active'
    linearBackbone.append(linearActive)

    const activeSegments = splitCircularRange(model.activeRange, model.sequenceLength)
    if (activeSegments.length > 0) {
      const first = activeSegments[0]
      const ratioStart = toLinearRatio(first.start, model.sequenceLength)
      const ratioEnd = toLinearRatio(first.end, model.sequenceLength)
      linearActive.style.left = `${ratioStart * 100}%`
      linearActive.style.width = `${Math.max(1, (ratioEnd - ratioStart) * 100)}%`
    }

    const markersForView = markers.filter((marker) => topology === 'circular' || !marker.wrapsOrigin)
    for (const marker of markersForView) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `plasmid-map__marker plasmid-map__marker--${marker.type}`
      button.setAttribute('data-feature-type', marker.type)
      button.setAttribute('data-position', String(marker.position))
      button.setAttribute('data-start', String(marker.start))
      button.setAttribute('data-end', String(marker.end))
      button.setAttribute('data-strand', marker.strand)
      if (marker.enzymeName) button.setAttribute('data-enzyme', marker.enzymeName)
      button.textContent = marker.label
      const start1 = marker.start + 1
      const end1 = marker.wrapsOrigin ? marker.end : Math.max(start1, marker.end)
      button.setAttribute('aria-label', `${marker.label} from base ${start1} to base ${end1}`)

      if (markerOverlapsActiveRange(marker, model.activeRange, model.sequenceLength, topology)) {
        button.classList.add('is-active')
      }

      button.addEventListener('click', () => onActivate({
        start: marker.start,
        end: marker.end,
      }))

      if (topology === 'circular') {
        const ratio = toLinearRatio(marker.start, model.sequenceLength)
        const angle = ratio * Math.PI * 2 - Math.PI / 2
        const radius = 42
        const x = 50 + Math.cos(angle) * radius
        const y = 50 + Math.sin(angle) * radius
        button.style.left = `${x}%`
        button.style.top = `${y}%`
        circularLayer.append(button)
      } else {
        const ratio = toLinearRatio(marker.start, model.sequenceLength)
        button.style.left = `${ratio * 100}%`
        button.style.top = marker.type === 'orf' ? '30%' : '70%'
        linearBackbone.append(button)
      }
    }

    circularMap.classList.toggle('hidden', topology !== 'circular')
    linearMap.classList.toggle('hidden', topology !== 'linear')
    summary.textContent = `Showing ${markersForView.length} markers · active range ${model.activeRange.start + 1}-${model.activeRange.end}`
  }

  const clear = () => {
    lastModel = null
    root.classList.add('hidden')
    root.hidden = true
    root.setAttribute('data-sequence-length', '0')
    root.setAttribute('data-active-range', '0:0')
    clearMapViews()
    summary.textContent = ''
  }

  syncTopologyButtons()
  clear()

  return { element: root, render, clear }
}
