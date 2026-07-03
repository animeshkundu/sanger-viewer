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
  bar.innerHTML = `<div class="workspace-bar__tabs" role="tablist" aria-label="Open traces"></div>`

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
    const isEvicted = slot.rawTrace === null
    const label = document.createElement('span')
    label.className = 'workspace-bar__tab-label'
    label.textContent = isEvicted ? `${slot.fileName} (evicted)` : slot.fileName

    // Provide full context for screen readers on evicted slots.
    if (isEvicted) {
      tab.setAttribute('aria-label', `${slot.fileName} — data unloaded, re-open file to restore`)
    } else {
      tab.setAttribute('aria-label', slot.fileName)
    }

    const closeBtn = document.createElement('span')
    closeBtn.className = 'workspace-bar__tab-close'
    closeBtn.setAttribute('aria-hidden', 'true')
    closeBtn.textContent = '×'
    tab.appendChild(label)
    tab.appendChild(closeBtn)

    tab.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('.workspace-bar__tab-close')) {
        bar.dispatchEvent(new CustomEvent('workspace-close', { bubbles: true, detail: { id: slot.id } }))
        return
      }
      if (slot.id !== activeId) {
        bar.dispatchEvent(new CustomEvent('workspace-switch', { bubbles: true, detail: { id: slot.id } }))
      }
    })
    tab.addEventListener('keydown', (event) => {
      if (slots.length > 1 && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault()
        bar.dispatchEvent(new CustomEvent('workspace-close', { bubbles: true, detail: { id: slot.id } }))
      }
    })

    tabsContainer.appendChild(tab)
  }

  bar.classList.toggle('workspace-bar--hidden', slots.length === 0)
}
