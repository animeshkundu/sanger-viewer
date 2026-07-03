import type { AnnotationFeature, BaseRange } from '../annotations'

type AnnotationRow = {
  label: string
  key: string
  matches: (feature: AnnotationFeature) => boolean
}

const ROWS: AnnotationRow[] = [
  { key: 'orf+1', label: 'ORF +1', matches: (feature) => feature.type === 'orf' && feature.frame === 1 },
  { key: 'orf+2', label: 'ORF +2', matches: (feature) => feature.type === 'orf' && feature.frame === 2 },
  { key: 'orf+3', label: 'ORF +3', matches: (feature) => feature.type === 'orf' && feature.frame === 3 },
  { key: 'restriction', label: 'Restriction', matches: (feature) => feature.type === 'restriction' },
  { key: 'orf-1', label: 'ORF -1', matches: (feature) => feature.type === 'orf' && feature.frame === -1 },
  { key: 'orf-2', label: 'ORF -2', matches: (feature) => feature.type === 'orf' && feature.frame === -2 },
  { key: 'orf-3', label: 'ORF -3', matches: (feature) => feature.type === 'orf' && feature.frame === -3 },
]

export interface AnnotationTrackModel {
  visibleFeatures: AnnotationFeature[]
  visibleRange: BaseRange
  totalCount: number
}

export interface AnnotationTrackHandle {
  element: HTMLElement
  render: (model: AnnotationTrackModel) => void
  clear: () => void
}

function getFeatureLabel(feature: AnnotationFeature): string {
  if (feature.type === 'orf') {
    const frame = feature.frame > 0 ? `+${feature.frame}` : String(feature.frame)
    return `ORF ${frame}`
  }
  return feature.enzymeName
}

function getFeatureAriaLabel(feature: AnnotationFeature): string {
  const baseLabel = `${getFeatureLabel(feature)} from ${feature.start} to ${feature.end}`
  if (feature.type === 'restriction') {
    return `${baseLabel}, strand ${feature.strand}, cuts at ${feature.cutForward} and ${feature.cutReverse}`
  }
  return `${baseLabel}, strand ${feature.strand}`
}

export function createAnnotationTrack(onActivate: (feature: AnnotationFeature) => void): AnnotationTrackHandle {
  const root = document.createElement('section')
  root.className = 'annotation-track'
  root.setAttribute('data-testid', 'annotation-track')
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Annotation track')

  const heading = document.createElement('h2')
  heading.className = 'annotation-track__title sr-only'
  heading.textContent = 'Annotation track'
  root.append(heading)

  const rowsContainer = document.createElement('div')
  rowsContainer.className = 'annotation-track__rows'
  root.append(rowsContainer)

  const rowLists = new Map<string, HTMLUListElement>()
  const featuresById = new Map<string, AnnotationFeature>()
  let rovingFeatureId: string | null = null
  let pendingFocusFeatureId: string | null = null

  for (const row of ROWS) {
    const rowEl = document.createElement('div')
    rowEl.className = 'annotation-row'
    rowEl.setAttribute('data-row', row.key)

    const label = document.createElement('div')
    label.className = 'annotation-row__label'
    label.textContent = row.label

    const list = document.createElement('ul')
    list.className = 'annotation-row__chips'
    list.setAttribute('role', 'list')

    rowEl.append(label, list)
    rowsContainer.append(rowEl)
    rowLists.set(row.key, list)
  }

  const getChipButtons = (): HTMLButtonElement[] => {
    return [...root.querySelectorAll<HTMLButtonElement>('.annotation-chip')]
  }

  const syncRovingTabIndex = () => {
    const chips = getChipButtons()
    if (chips.length === 0) {
      rovingFeatureId = null
      return
    }

    let active = chips.find((chip) => chip.dataset.featureId === rovingFeatureId)
    if (!active) active = chips[0]
    rovingFeatureId = active.dataset.featureId ?? null

    for (const chip of chips) {
      chip.tabIndex = chip === active ? 0 : -1
    }
  }

  const moveFocus = (nextIndex: number) => {
    const chips = getChipButtons()
    if (chips.length === 0) return
    const clampedIndex = Math.max(0, Math.min(nextIndex, chips.length - 1))
    const target = chips[clampedIndex]
    rovingFeatureId = target.dataset.featureId ?? null
    syncRovingTabIndex()
    target.focus()
  }

  const activateFeature = (button: HTMLButtonElement) => {
    const featureId = button.dataset.featureId
    if (!featureId) return
    const feature = featuresById.get(featureId)
    if (!feature) return
    rovingFeatureId = featureId
    pendingFocusFeatureId = featureId
    syncRovingTabIndex()
    onActivate(feature)
  }

  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.annotation-chip')
    if (!button) return
    activateFeature(button)
  })

  root.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement
    const chip = target.closest<HTMLButtonElement>('.annotation-chip')
    if (!chip) return

    const chips = getChipButtons()
    const index = chips.indexOf(chip)
    if (index < 0) return

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(index + 1)
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(index - 1)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      moveFocus(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      moveFocus(chips.length - 1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      activateFeature(chip)
    }
  })

  const render = (model: AnnotationTrackModel) => {
    root.setAttribute('data-total-count', String(model.totalCount))
    root.setAttribute('data-visible-count', String(model.visibleFeatures.length))
    root.setAttribute('data-visible-range', `${model.visibleRange.start}:${model.visibleRange.end}`)

    featuresById.clear()
    for (const list of rowLists.values()) {
      list.textContent = ''
    }

    for (const row of ROWS) {
      const list = rowLists.get(row.key)
      if (!list) continue

      for (const feature of model.visibleFeatures) {
        if (!row.matches(feature)) continue

        const item = document.createElement('li')
        item.className = 'annotation-chip-item'
        item.setAttribute('role', 'listitem')

        const button = document.createElement('button')
        button.type = 'button'
        button.className = `annotation-chip annotation-chip--${feature.type}`
        button.setAttribute('role', 'button')
        button.dataset.featureId = feature.id
        button.dataset.featureType = feature.type
        button.dataset.start = String(feature.start)
        button.dataset.end = String(feature.end)
        if (feature.type === 'orf') {
          button.dataset.frame = String(feature.frame)
          button.dataset.strand = feature.strand
        } else {
          button.dataset.enzyme = feature.enzymeName
          button.dataset.strand = feature.strand
          button.dataset.cutForward = String(feature.cutForward)
          button.dataset.cutReverse = String(feature.cutReverse)
        }
        button.setAttribute('aria-label', getFeatureAriaLabel(feature))
        button.textContent = `${getFeatureLabel(feature)} ${feature.start}-${feature.end}`

        item.append(button)
        list.append(item)
        featuresById.set(feature.id, feature)
      }
    }

    syncRovingTabIndex()
    const restoreId = pendingFocusFeatureId
    pendingFocusFeatureId = null
    if (!restoreId) return
    const restoredButton = getChipButtons().find((chip) => chip.dataset.featureId === restoreId)
    if (!restoredButton) return
    rovingFeatureId = restoreId
    syncRovingTabIndex()
    restoredButton.focus()
  }

  const clear = () => {
    render({ visibleFeatures: [], visibleRange: { start: 0, end: 0 }, totalCount: 0 })
  }

  clear()

  return { element: root, render, clear }
}
