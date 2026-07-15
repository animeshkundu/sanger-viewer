const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
}

export type KeyboardShortcutsDialog = {
  element: HTMLDialogElement
  destroy: () => void
}

export function createKeyboardShortcutsDialog(): KeyboardShortcutsDialog {
  const dialog = document.createElement('dialog')
  dialog.className = 'keyboard-shortcuts-dialog'
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', 'keyboard-shortcuts-title')
  dialog.innerHTML = `
    <div class="keyboard-shortcuts-dialog__header">
      <h2 id="keyboard-shortcuts-title">Keyboard shortcuts</h2>
      <button type="button" class="keyboard-shortcuts-dialog__close" aria-label="Close keyboard shortcuts">×</button>
    </div>
    <dl class="keyboard-shortcuts-dialog__list">
      <div><dt><kbd>?</kbd></dt><dd>Open keyboard shortcuts</dd></div>
      <div><dt><kbd>Esc</kbd></dt><dd>Close an open dialog or menu</dd></div>
      <div><dt><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd></dt><dd>Undo</dd></div>
      <div><dt><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></dt><dd>Redo</dd></div>
      <div><dt><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Y</kbd></dt><dd>Redo (alternative)</dd></div>
      <div><dt><kbd>Enter</kbd></dt><dd>Next search match</dd></div>
      <div><dt><kbd>Shift</kbd> + <kbd>Enter</kbd></dt><dd>Previous search match</dd></div>
      <div><dt><kbd>Enter</kbd> / <kbd>Space</kbd></dt><dd>Inspect a focused base</dd></div>
      <div><dt><kbd>Delete</kbd> / <kbd>Backspace</kbd></dt><dd>Restore a focused base call</dd></div>
    </dl>
    <p class="keyboard-shortcuts-dialog__hint">Search shortcuts apply while the search field is focused.</p>
  `

  const closeButton = dialog.querySelector<HTMLButtonElement>('.keyboard-shortcuts-dialog__close')!
  let returnFocus: HTMLElement | null = null

  const open = () => {
    if (dialog.open) return
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    closeButton.focus()
  }

  const close = () => {
    if (dialog.open) dialog.close()
  }

  const restoreFocus = () => {
    if (returnFocus?.isConnected) returnFocus.focus()
    returnFocus = null
  }

  const handleGlobalKeydown = (event: KeyboardEvent) => {
    if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) return
    event.preventDefault()
    open()
  }

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
      .filter((element) => !element.hasAttribute('hidden'))
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) {
      event.preventDefault()
      dialog.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleCancel = (event: Event) => {
    event.preventDefault()
    close()
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === dialog) close()
  }

  closeButton.addEventListener('click', close)
  dialog.addEventListener('keydown', handleDialogKeydown)
  dialog.addEventListener('cancel', handleCancel)
  dialog.addEventListener('close', restoreFocus)
  dialog.addEventListener('click', handleBackdropClick)
  document.addEventListener('keydown', handleGlobalKeydown)

  return {
    element: dialog,
    destroy: () => {
      document.removeEventListener('keydown', handleGlobalKeydown)
      if (dialog.open) dialog.close()
      dialog.remove()
    },
  }
}
