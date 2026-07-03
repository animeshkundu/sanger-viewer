import { ANNOTATION_ROW_ORDER, type AnnotationBaseRange, type AnnotationFeature } from '../annotations'

interface RenderAnnotationTrackOptions {
  visibleFeatures: AnnotationFeature[]
  visibleRange: AnnotationBaseRange
  totalCount: number
}

const ROW_LABELS: Record<(typeof ANNOTATION_ROW_ORDER)[number], string> = {
  'orf+1': 'ORF +1',
  'orf+2': 'ORF +2',
  'orf+3': 'ORF +3',
  restriction: 'Restriction',
  'orf-1': 'ORF -1',
  'orf-2': 'ORF -2',
  'orf-3': 'ORF -3',
}

function toDisplayRange(start: number, end: number): string {
  return `${start + 1}–${end}`
}

function describeFeature(feature: AnnotationFeature): string {
  const typeLabel = feature.type === 'orf' ? `Open reading frame ${feature.strand}${feature.frame}` : `${feature.enzyme} restriction site`
  return `${typeLabel}, bases ${toDisplayRange(feature.start, feature.end)}`
}

function setRovingTabIndex(chips: HTMLButtonElement[], activeIndex: number): void {
  chips.forEach((chip, index) => {
    chip.tabIndex = index === activeIndex ? 0 : -1
  })
}

export function createAnnotationTrack(onNavigate: (feature: AnnotationFeature) => void): {
  root: HTMLDivElement
  render: (options: RenderAnnotationTrackOptions) => void
  clear: () => void
} {
  const root = document.createElement('div')
  root.className = 'annotation-track'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Sequence annotations')

  const rowContainers = new Map<string, HTMLDivElement>()
  for (const row of ANNOTATION_ROW_ORDER) {
    const rowEl = document.createElement('div')
    rowEl.className = 'annotation-track__row'

    const label = document.createElement('span')
    label.className = 'annotation-track__row-label'
    label.textContent = ROW_LABELS[row]

    const lane = document.createElement('div')
    lane.className = 'annotation-track__lane'
    lane.setAttribute('role', 'list')
    lane.setAttribute('aria-label', `${ROW_LABELS[row]} annotations`)

    rowEl.append(label, lane)
    rowContainers.set(row, lane)
    root.appendChild(rowEl)
  }

  const render = ({ visibleFeatures, visibleRange, totalCount }: RenderAnnotationTrackOptions) => {
    root.setAttribute('data-annotation-total-count', String(totalCount))
    root.setAttribute('data-annotation-visible-count', String(visibleFeatures.length))
    root.setAttribute('data-annotation-visible-range', `${visibleRange.start}:${visibleRange.end}`)

    const byRow = new Map<string, AnnotationFeature[]>()
    for (const feature of visibleFeatures) {
      const list = byRow.get(feature.row)
      if (list) list.push(feature)
      else byRow.set(feature.row, [feature])
    }

    for (const row of ANNOTATION_ROW_ORDER) {
      const lane = rowContainers.get(row)
      if (!lane) continue
      lane.replaceChildren()
      const rowFeatures = byRow.get(row) ?? []
      if (rowFeatures.length === 0) {
        const empty = document.createElement('span')
        empty.className = 'annotation-track__empty'
        empty.setAttribute('aria-hidden', 'true')
        empty.textContent = '—'
        lane.appendChild(empty)
        continue
      }

      rowFeatures.forEach((feature, index) => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = `annotation-chip annotation-chip--${feature.type}`
        chip.setAttribute('data-annotation-chip', 'true')
        chip.setAttribute('data-annotation-id', feature.id)
        chip.setAttribute('data-annotation-type', feature.type)
        chip.setAttribute('data-annotation-start', String(feature.start))
        chip.setAttribute('data-annotation-end', String(feature.end))
        chip.setAttribute('aria-label', describeFeature(feature))
        chip.tabIndex = index === 0 ? 0 : -1
        chip.textContent = `${feature.name} ${toDisplayRange(feature.start, feature.end)}`
        chip.addEventListener('click', () => {
          const chips = [...lane.querySelectorAll<HTMLButtonElement>('.annotation-chip')]
          const currentIndex = chips.indexOf(chip)
          if (currentIndex >= 0) setRovingTabIndex(chips, currentIndex)
          onNavigate(feature)
        })
        chip.addEventListener('keydown', (event) => {
          if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
          const chips = [...lane.querySelectorAll<HTMLButtonElement>('.annotation-chip')]
          if (chips.length === 0) return
          const currentIndex = chips.indexOf(chip)
          if (currentIndex < 0) return
          event.preventDefault()

          let nextIndex = currentIndex
          if (event.key === 'ArrowRight') nextIndex = Math.min(chips.length - 1, currentIndex + 1)
          if (event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1)
          if (event.key === 'Home') nextIndex = 0
          if (event.key === 'End') nextIndex = chips.length - 1
          setRovingTabIndex(chips, nextIndex)
          chips[nextIndex]?.focus()
        })
        lane.appendChild(chip)
      })
    }
  }

  const clear = () => {
    render({
      visibleFeatures: [],
      visibleRange: { start: 0, end: 0 },
      totalCount: 0,
    })
  }

  clear()

  return { root, render, clear }
}
