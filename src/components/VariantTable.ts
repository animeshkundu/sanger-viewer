/**
 * VariantTable.ts — Variant review table with filter tabs and export actions.
 *
 * Events dispatched on the root element:
 *   variant-select     — { variantId: string }
 *   variant-review     — { variantId: string, review: CalledVariant['review'] }
 *   export-variants-csv  — (no detail)
 *   export-variants-vcf  — (no detail)
 */

import type { CalledVariant } from '../types/alignment'
import type { VariantFilterMode } from '../variants/filter'
import { filterVariants, countByType } from '../variants/filter'

export interface VariantTableElements {
  root: HTMLDivElement
  tabBar: HTMLDivElement
  tableBody: HTMLTableSectionElement
  summary: HTMLDivElement
  exportCsvBtn: HTMLButtonElement
  exportVcfBtn: HTMLButtonElement
}

export function createVariantTable(): VariantTableElements {
  const root = document.createElement('div')
  root.className = 'variant-table'
  root.setAttribute('data-testid', 'variant-table')
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Variant table')

  root.innerHTML = `
    <div class="variant-table__header">
      <h3 class="variant-table__title">Variants</h3>
      <div class="variant-table__tabs" role="tablist" aria-label="Variant filter" data-testid="variant-tabs">
        <button type="button" role="tab" class="variant-tab variant-tab--active" data-filter="all" aria-selected="true" aria-label="All variants">All</button>
        <button type="button" role="tab" class="variant-tab" data-filter="high" aria-selected="false" aria-label="High-confidence variants">High</button>
        <button type="button" role="tab" class="variant-tab" data-filter="ambiguous" aria-selected="false" aria-label="Ambiguous variants">Ambig</button>
        <button type="button" role="tab" class="variant-tab" data-filter="indel" aria-selected="false" aria-label="Insertions and deletions">Indel</button>
      </div>
      <div class="variant-table__export">
        <button type="button" class="variant-table__export-btn" data-action="export-variants-csv" data-testid="export-variants-csv" aria-label="Export variants as CSV" disabled>CSV</button>
        <button type="button" class="variant-table__export-btn" data-action="export-variants-vcf" data-testid="export-variants-vcf" aria-label="Export variants as VCF" disabled>VCF</button>
      </div>
    </div>
    <div class="variant-table__summary" data-testid="variant-summary"></div>
    <div class="variant-table__wrap">
      <table class="variant-table__table" role="table" aria-label="Variant list">
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Ref</th>
            <th scope="col">Alt</th>
            <th scope="col">Type</th>
            <th scope="col">Conf</th>
            <th scope="col">Review</th>
          </tr>
        </thead>
        <tbody data-testid="variant-tbody"></tbody>
      </table>
    </div>
    <p class="variant-table__empty hidden" data-testid="variant-empty">No variants found.</p>
  `

  const tabBar = root.querySelector<HTMLDivElement>('.variant-table__tabs')!
  const tableBody = root.querySelector<HTMLTableSectionElement>('[data-testid="variant-tbody"]')!
  const summary = root.querySelector<HTMLDivElement>('.variant-table__summary')!
  const exportCsvBtn = root.querySelector<HTMLButtonElement>('[data-action="export-variants-csv"]')!
  const exportVcfBtn = root.querySelector<HTMLButtonElement>('[data-action="export-variants-vcf"]')!

  return { root, tabBar, tableBody, summary, exportCsvBtn, exportVcfBtn }
}

function reviewLabel(review: CalledVariant['review']): string {
  switch (review) {
    case 'accepted': return '✓ accepted'
    case 'uncertain': return '? uncertain'
    case 'suppressed': return '✗ suppressed'
    default: return '— unreviewed'
  }
}

function nextReview(current: CalledVariant['review']): CalledVariant['review'] {
  const cycle: CalledVariant['review'][] = ['unreviewed', 'accepted', 'uncertain', 'suppressed']
  const idx = cycle.indexOf(current)
  return cycle[(idx + 1) % cycle.length]
}

/**
 * Render the variant table with the given variant list.
 * Dispatches events on the root element for selection and review changes.
 */
export function renderVariantTable(
  elements: VariantTableElements,
  variants: CalledVariant[],
  activeFilter: VariantFilterMode = 'all',
  selectedVariantId: string | null = null,
): void {
  const { root, tabBar, tableBody, summary, exportCsvBtn, exportVcfBtn } = elements

  // Update tab active state.
  tabBar.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((btn) => {
    const isActive = btn.dataset.filter === activeFilter
    btn.classList.toggle('variant-tab--active', isActive)
    btn.setAttribute('aria-selected', String(isActive))
  })

  const visible = filterVariants(variants, activeFilter, true)
  const counts = countByType(variants)
  const total = variants.filter((v) => v.review !== 'suppressed').length

  // Summary bar.
  summary.textContent = variants.length === 0
    ? 'No variants called'
    : `${total} variant${total !== 1 ? 's' : ''} · ${counts.snv} SNV · ${counts.insertion} ins · ${counts.deletion} del · ${counts.ambiguous} ambig`
  summary.dataset.testid = 'variant-summary'

  // Export buttons state.
  const hasExportable = variants.some((v) => v.review !== 'suppressed')
  exportCsvBtn.disabled = !hasExportable
  exportVcfBtn.disabled = !hasExportable

  // Empty state.
  const emptyEl = root.querySelector<HTMLElement>('.variant-table__empty')!
  const tableWrap = root.querySelector<HTMLElement>('.variant-table__wrap')!
  const isEmpty = visible.length === 0
  emptyEl.classList.toggle('hidden', !isEmpty)
  tableWrap.classList.toggle('hidden', isEmpty)

  // Rebuild rows.
  tableBody.innerHTML = ''
  for (const variant of visible) {
    const tr = document.createElement('tr')
    tr.setAttribute('data-variant-id', variant.id)
    tr.setAttribute('role', 'row')
    tr.setAttribute('tabindex', '0')
    tr.setAttribute('aria-selected', String(variant.id === selectedVariantId))
    if (variant.id === selectedVariantId) tr.classList.add('variant-row--selected')
    if (variant.review === 'suppressed') tr.classList.add('variant-row--suppressed')

    tr.innerHTML = `
      <td class="variant-pos">${variant.position}</td>
      <td class="variant-ref">${variant.ref}</td>
      <td class="variant-alt">${variant.alt}</td>
      <td class="variant-type variant-type--${variant.type}">${variant.type}</td>
      <td class="variant-conf variant-conf--${variant.confidence}">${variant.confidence}</td>
      <td class="variant-review">
        <button
          type="button"
          class="variant-review-btn"
          data-variant-id="${variant.id}"
          data-action="cycle-review"
          aria-label="Cycle review state for variant at position ${variant.position}"
        >${reviewLabel(variant.review)}</button>
      </td>
    `

    // Row click → select variant.
    tr.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).dataset.action === 'cycle-review') return
      root.dispatchEvent(new CustomEvent('variant-select', { bubbles: true, detail: { variantId: variant.id } }))
    })

    // Row keyboard — Enter/Space to select.
    tr.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        root.dispatchEvent(new CustomEvent('variant-select', { bubbles: true, detail: { variantId: variant.id } }))
      }
    })

    // Review cycle button.
    const reviewBtn = tr.querySelector<HTMLButtonElement>('[data-action="cycle-review"]')!
    reviewBtn.addEventListener('click', (event) => {
      event.stopPropagation()
      const newReview = nextReview(variant.review)
      root.dispatchEvent(new CustomEvent('variant-review', { bubbles: true, detail: { variantId: variant.id, review: newReview } }))
    })

    tableBody.appendChild(tr)
  }

  // Export button click handlers (re-dispatch action events).
  exportCsvBtn.onclick = () => root.dispatchEvent(new CustomEvent('export-variants-csv', { bubbles: true }))
  exportVcfBtn.onclick = () => root.dispatchEvent(new CustomEvent('export-variants-vcf', { bubbles: true }))
}

/** Show or hide the variant table panel. */
export function setVariantTableVisible(elements: VariantTableElements, visible: boolean): void {
  elements.root.classList.toggle('hidden', !visible)
}
