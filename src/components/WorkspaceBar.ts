/**
 * WorkspaceBar — horizontal tab strip for multi-trace slot switching.
 *
 * Renders one tab per slot, highlights the active one, and emits custom
 * events so TraceViewer can coordinate state saves/restores:
 *
 *   "workspace-switch"  — { detail: { id } }   user clicked a different tab
 *   "workspace-close"   — { detail: { id } }   user clicked × on a tab
 *   "workspace-open"    — (no detail)           user clicked "Open another"
 */

import type { TraceSlot } from '../workspace/TraceWorkspace'

/** Root element class so CSS can scope all bar styles. */
const BAR_CLASS = 'workspace-bar'

export function createWorkspaceBar(): HTMLDivElement {
  const bar = document.createElement('div')
  bar.className = BAR_CLASS
  bar.setAttribute('role', 'tablist')
  bar.setAttribute('aria-label', 'Open traces')
  bar.innerHTML = `<div class="workspace-bar__tabs" role="presentation"></div>`

  // "Open another file" button lives outside the tab list.
  const openBtn = document.createElement('button')
  openBtn.className = 'workspace-bar__open-btn'
  openBtn.title = 'Open another trace'
  openBtn.setAttribute('aria-label', 'Open another trace')
  openBtn.textContent = '＋'
  openBtn.addEventListener('click', () => {
    bar.dispatchEvent(new CustomEvent('workspace-open', { bubbles: true }))
  })
  bar.appendChild(openBtn)

  return bar
}

/**
 * Re-render the tab strip to reflect the current workspace state.
 * Call this whenever slots change or the active slot changes.
 */
export function renderWorkspaceBar(bar: HTMLDivElement, slots: readonly TraceSlot[], activeId: string | null): void {
  const tabsContainer = bar.querySelector<HTMLDivElement>('.workspace-bar__tabs')!
  tabsContainer.innerHTML = ''

  for (const slot of slots) {
    const tab = document.createElement('button')
    tab.className = 'workspace-bar__tab'
    tab.setAttribute('role', 'tab')
    tab.setAttribute('data-slot-id', slot.id)
    tab.setAttribute('aria-selected', slot.id === activeId ? 'true' : 'false')
    tab.title = slot.fileName

    // Evicted slots show a faded indicator so the user knows they can re-open.
    const label = document.createElement('span')
    label.className = 'workspace-bar__tab-label'
    label.textContent = slot.rawTrace === null ? `${slot.fileName} (evicted)` : slot.fileName

    const closeBtn = document.createElement('button')
    closeBtn.className = 'workspace-bar__tab-close'
    closeBtn.setAttribute('aria-label', `Close ${slot.fileName}`)
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      bar.dispatchEvent(new CustomEvent('workspace-close', { bubbles: true, detail: { id: slot.id } }))
    })

    tab.appendChild(label)
    tab.appendChild(closeBtn)

    tab.addEventListener('click', () => {
      if (slot.id !== activeId) {
        bar.dispatchEvent(new CustomEvent('workspace-switch', { bubbles: true, detail: { id: slot.id } }))
      }
    })

    tabsContainer.appendChild(tab)
  }

  // Hide the entire bar when there is at most one slot (single-trace mode).
  bar.classList.toggle('workspace-bar--hidden', slots.length <= 1)
}
