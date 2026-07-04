/**
 * ReferencePanel.ts — UI component for attaching a reference sequence
 * and triggering alignment.
 *
 * Events dispatched on the root element:
 *   align-reference  — { reference: string, referenceId: string }
 *   load-reference   — same payload (from FASTA file input)
 */

export interface ReferencePanelElements {
  root: HTMLDivElement
  textarea: HTMLTextAreaElement
  fileInput: HTMLInputElement
  alignBtn: HTMLButtonElement
  clearBtn: HTMLButtonElement
  statusSpan: HTMLSpanElement
}

export function createReferencePanel(): ReferencePanelElements {
  const root = document.createElement('div')
  root.className = 'reference-panel'
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Align to reference')
  root.dataset.testid = 'reference-panel'

  root.innerHTML = `
    <h3 class="reference-panel__title">Align to reference</h3>
    <p class="reference-panel__hint">
      Paste a reference sequence (plain bases or FASTA) or load a <code>.fa</code>/<code>.fasta</code> file.
      Alignment runs entirely in your browser — nothing is uploaded.
    </p>
    <div class="reference-panel__row">
      <textarea
        id="reference-sequence-input"
        class="reference-panel__textarea"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="characters"
        placeholder=">reference_name&#10;ACGT..."
        aria-label="Reference sequence (FASTA or plain bases)"
        rows="4"
      ></textarea>
    </div>
    <div class="reference-panel__actions">
      <label class="reference-panel__file-label" aria-label="Load reference FASTA file">
        📂 Load FASTA
        <input
          type="file"
          id="reference-file-input"
          accept=".fa,.fasta,.txt"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
        />
      </label>
      <button
        type="button"
        id="align-btn"
        class="reference-panel__align-btn"
        data-action="align-reference"
        data-testid="align-btn"
        disabled
        aria-label="Align trace to reference sequence"
      >Align</button>
      <button
        type="button"
        id="reference-clear-btn"
        class="reference-panel__clear-btn"
        data-action="clear-reference"
        aria-label="Clear reference sequence"
      >Clear</button>
    </div>
    <div class="reference-panel__status" role="status" aria-live="polite" aria-atomic="true">
      <span id="reference-status" class="reference-panel__status-text" data-testid="reference-status"></span>
    </div>
  `

  const textarea = root.querySelector<HTMLTextAreaElement>('#reference-sequence-input')!
  const fileInput = root.querySelector<HTMLInputElement>('#reference-file-input')!
  const alignBtn = root.querySelector<HTMLButtonElement>('#align-btn')!
  const clearBtn = root.querySelector<HTMLButtonElement>('#reference-clear-btn')!
  const statusSpan = root.querySelector<HTMLSpanElement>('#reference-status')!

  // Enable align button when textarea has content.
  textarea.addEventListener('input', () => {
    alignBtn.disabled = textarea.value.trim().length === 0
  })

  // Load FASTA file into textarea.
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      textarea.value = text.trim()
      alignBtn.disabled = textarea.value.length === 0
      fileInput.value = ''
    }
    reader.readAsText(file)
  })

  return { root, textarea, fileInput, alignBtn, clearBtn, statusSpan }
}

/**
 * Update the status message shown beneath the reference panel.
 */
export function setReferencePanelStatus(
  elements: ReferencePanelElements,
  message: string,
  kind: 'idle' | 'success' | 'error' = 'idle',
): void {
  elements.statusSpan.textContent = message
  elements.root.dataset.statusKind = kind
}
