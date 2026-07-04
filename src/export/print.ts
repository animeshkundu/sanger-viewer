/**
 * print.ts — Print/PDF-friendly export helper.
 *
 * buildPrintSection() creates a self-contained DOM element that carries all
 * content needed for the browser's native print-to-PDF dialog:
 *   • A metadata header (file name, length, strand, trim mode, mean quality, date)
 *   • A raster snapshot of the chromatogram canvas at the current zoom window
 *   • A raster snapshot of the quality-bar track canvas
 *   • The currently visible sequence text
 *   • An annotation summary (feature count) when annotations are present
 *
 * The element is appended to <body> immediately before window.print() is called
 * and removed by an `afterprint` listener so it never pollutes the live view.
 * The companion @media print stylesheet (src/style.css) hides every other
 * body-level element while the print view is present.
 */

export interface PrintSectionData {
  /** File name of the currently active trace, e.g. "310.ab1". */
  fileName: string
  /** Total base-call count (before any trimming). */
  totalBases: number
  /** Whether the reverse-complement strand is currently shown. */
  isRevcomp: boolean
  /** Active trim mode ("full" = untrimmed, "trimmed" = Mott-trimmed window). */
  trimMode: 'full' | 'trimmed'
  /** Number of bases kept after Mott trimming, or null when trim data absent. */
  trimmedBp: number | null
  /** Mean PHRED quality over the kept region, or null when unavailable. */
  meanQuality: number | null
  /** Concatenated text of the currently visible base spans in the sequence panel. */
  visibleSequence: string
  /** Count of annotation features visible in the current viewport. */
  annotationCount: number
  /** PNG data URL produced by toDataURL() on the chromatogram canvas. */
  chromatogramDataUrl: string
  /** PNG data URL from the quality-track canvas, or null when the track is hidden. */
  qualityDataUrl: string | null
}

/** ISO YYYY-MM-DD date string for today (en-CA locale always emits this format). */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA')
}

function addMetaRow(dl: HTMLDListElement, label: string, value: string, testid: string): void {
  const dt = document.createElement('dt')
  dt.className = 'print-header__term'
  dt.textContent = label

  const dd = document.createElement('dd')
  dd.className = 'print-header__def'
  dd.setAttribute('data-testid', testid)
  dd.textContent = value

  dl.append(dt, dd)
}

/**
 * Build and return the `<section id="print-view">` element populated with the
 * supplied data.  The caller is responsible for appending it to `document.body`
 * and removing it after printing.
 */
export function buildPrintSection(data: PrintSectionData): HTMLElement {
  const el = document.createElement('section')
  el.id = 'print-view'
  el.setAttribute('data-testid', 'print-view')
  el.setAttribute('aria-hidden', 'true')
  el.setAttribute('data-annotation-count', String(data.annotationCount))

  // ── Metadata header ──────────────────────────────────────────────────────
  const header = document.createElement('div')
  header.className = 'print-header'
  header.setAttribute('data-testid', 'print-header')

  const title = document.createElement('h1')
  title.className = 'print-header__title'
  title.textContent = data.fileName

  const dl = document.createElement('dl')
  dl.className = 'print-header__meta'

  addMetaRow(dl, 'Length', `${data.totalBases} bp`, 'print-length')
  addMetaRow(dl, 'Strand', data.isRevcomp ? 'Reverse complement (3′→5′)' : 'Forward (5′→3′)', 'print-strand')

  const trimLabel =
    data.trimMode === 'trimmed'
      ? data.trimmedBp !== null
        ? `Trimmed · ${data.trimmedBp} bp kept`
        : 'Trimmed'
      : 'Full (untrimmed)'
  addMetaRow(dl, 'Mode', trimLabel, 'print-trim-mode')

  if (data.meanQuality !== null) {
    addMetaRow(dl, 'Mean quality', `Q${data.meanQuality.toFixed(1)}`, 'print-mean-quality')
  }

  addMetaRow(dl, 'Date', todayIso(), 'print-date')

  header.append(title, dl)
  el.appendChild(header)

  // ── Chromatogram snapshot ────────────────────────────────────────────────
  const chromSection = document.createElement('section')
  chromSection.className = 'print-chromatogram'
  chromSection.setAttribute('data-testid', 'print-chromatogram')

  const chromHeading = document.createElement('h2')
  chromHeading.className = 'print-section__heading'
  chromHeading.textContent = 'Chromatogram'

  const chromImg = document.createElement('img')
  chromImg.className = 'print-chromatogram__img'
  chromImg.src = data.chromatogramDataUrl
  chromImg.alt = 'Chromatogram trace (current zoom window)'

  chromSection.append(chromHeading, chromImg)
  el.appendChild(chromSection)

  // ── Quality-track snapshot ───────────────────────────────────────────────
  if (data.qualityDataUrl) {
    const qualSection = document.createElement('section')
    qualSection.className = 'print-quality'
    qualSection.setAttribute('data-testid', 'print-quality')

    const qualHeading = document.createElement('h2')
    qualHeading.className = 'print-section__heading'
    qualHeading.textContent = 'Quality track'

    const qualImg = document.createElement('img')
    qualImg.className = 'print-quality__img'
    qualImg.src = data.qualityDataUrl
    qualImg.alt = 'Per-base PHRED quality bars'

    qualSection.append(qualHeading, qualImg)
    el.appendChild(qualSection)
  }

  // ── Visible sequence ─────────────────────────────────────────────────────
  const seqSection = document.createElement('section')
  seqSection.className = 'print-sequence'
  seqSection.setAttribute('data-testid', 'print-sequence')

  const seqHeading = document.createElement('h2')
  seqHeading.className = 'print-section__heading'
  seqHeading.textContent =
    data.trimMode === 'trimmed' ? 'Sequence (trimmed window)' : 'Sequence (visible window)'

  const seqPre = document.createElement('pre')
  seqPre.className = 'print-sequence__bases'
  seqPre.setAttribute('data-testid', 'print-sequence-bases')
  seqPre.textContent = data.visibleSequence

  seqSection.append(seqHeading, seqPre)
  el.appendChild(seqSection)

  // ── Annotation summary ───────────────────────────────────────────────────
  if (data.annotationCount > 0) {
    const annSection = document.createElement('section')
    annSection.className = 'print-annotations'
    annSection.setAttribute('data-testid', 'print-annotations')

    const annHeading = document.createElement('h2')
    annHeading.className = 'print-section__heading'
    annHeading.textContent = `Annotations (${data.annotationCount} feature${data.annotationCount === 1 ? '' : 's'} in view)`

    annSection.appendChild(annHeading)
    el.appendChild(annSection)
  }

  return el
}
