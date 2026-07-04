/**
 * stackedViewer.ts — Pure, DOM-free logic for the multi-trace clone-screen view.
 *
 * Computes per-column base agreements / mismatches across N traces and provides
 * cursor navigation helpers for fast clone screening.
 *
 * All computations are client-side; no data leaves the browser.
 */

// ── IUPAC ambiguity resolution (mirrors consensus.ts) ─────────────────────────

const IUPAC: Record<string, string> = {
  AC: 'M', AG: 'R', AT: 'W', CG: 'S', CT: 'Y', GT: 'K',
  ACG: 'V', ACT: 'H', AGT: 'D', CGT: 'B', ACGT: 'N',
}
const CANONICAL = 'ACGT'

function sortedTied(bases: string[]): string[] {
  return [...bases].sort((a, b) => {
    const ai = CANONICAL.indexOf(a)
    const bi = CANONICAL.indexOf(b)
    const ar = ai === -1 ? 4 : ai
    const br = bi === -1 ? 4 : bi
    return ar !== br ? ar - br : a < b ? -1 : a > b ? 1 : 0
  })
}

function resolveConsensusBase(bases: string[]): string {
  const freq = new Map<string, number>()
  for (const b of bases) {
    const up = b.toUpperCase()
    freq.set(up, (freq.get(up) ?? 0) + 1)
  }
  if (freq.size === 1) return [...freq.keys()][0]
  const maxCount = Math.max(...freq.values())
  const tied = sortedTied(
    [...freq.entries()].filter(([, c]) => c === maxCount).map(([b]) => b),
  )
  const key = tied.join('')
  const allCanonical = tied.every((b) => CANONICAL.includes(b))
  if (allCanonical && IUPAC[key]) return IUPAC[key]
  if (tied.length === 1) return tied[0]
  return 'N'
}

// ── Public types ────────────────────────────────────────────────────────────────

/** Per-column data for one position across all stacked traces. */
export interface StackedColumn {
  /** 0-based column index into each sequence. */
  position: number
  /** Uppercase base at this column for each trace (same order as input sequences). */
  bases: string[]
  /** True when all traces agree on the same base. */
  allAgree: boolean
  /** Plurality-majority base or IUPAC ambiguity code for ties. */
  consensusBase: string
}

/** Result of computeStackedView — all per-column data for N sequences. */
export interface StackedViewResult {
  /** Column data; length = Math.min of all sequence lengths. */
  columns: StackedColumn[]
  /** Sorted 0-based indices of columns where traces disagree. */
  mismatchIndices: number[]
  /** Number of sequences compared. */
  traceCount: number
  /** Number of positions compared (= min sequence length). */
  length: number
}

// ── Core computation ───────────────────────────────────────────────────────────

/**
 * Compute per-column stacked comparison for N sequences.
 *
 * Length is clamped to Math.min of all input sequence lengths.
 * Returns an empty result when fewer than 2 sequences are provided.
 */
export function computeStackedView(sequences: string[]): StackedViewResult {
  const resident = sequences.filter((s) => typeof s === 'string' && s.length > 0)
  if (resident.length < 2) {
    return { columns: [], mismatchIndices: [], traceCount: resident.length, length: 0 }
  }

  const length = Math.min(...resident.map((s) => s.length))
  const columns: StackedColumn[] = []
  const mismatchIndices: number[] = []

  for (let i = 0; i < length; i++) {
    const bases = resident.map((s) => s[i].toUpperCase())
    const first = bases[0]
    const allAgree = bases.every((b) => b === first)
    const consensusBase = allAgree ? first : resolveConsensusBase(bases)
    columns.push({ position: i, bases, allAgree, consensusBase })
    if (!allAgree) mismatchIndices.push(i)
  }

  return { columns, mismatchIndices, traceCount: resident.length, length }
}

// ── Cursor navigation ──────────────────────────────────────────────────────────

/**
 * Return the next mismatch column index after `cursorPos`, or null if none.
 */
export function nextMismatch(mismatchIndices: number[], cursorPos: number): number | null {
  for (const m of mismatchIndices) {
    if (m > cursorPos) return m
  }
  return null
}

/**
 * Return the previous mismatch column index before `cursorPos`, or null if none.
 */
export function prevMismatch(mismatchIndices: number[], cursorPos: number): number | null {
  let last: number | null = null
  for (const m of mismatchIndices) {
    if (m < cursorPos) last = m
    else break
  }
  return last
}

/**
 * Clamp a cursor position to [0, length - 1].
 * Returns 0 for empty sequences.
 */
export function clampCursor(pos: number, length: number): number {
  if (length === 0) return 0
  return Math.max(0, Math.min(pos, length - 1))
}

/**
 * Build a tab-separated mismatch report string.
 *
 * Format:
 *   Position\tConsensus\tTrace1\tTrace2\t...
 *   1\tY\tC\tT\t...
 *
 * Only mismatch columns are included. Positions are 1-based.
 * Returns an empty string when there are no mismatches.
 */
export function buildMismatchReport(result: StackedViewResult, fileNames: string[]): string {
  if (result.mismatchIndices.length === 0) return ''
  const header = ['Position', 'Consensus', ...fileNames].join('\t')
  const rows = result.mismatchIndices.map((i) => {
    const col = result.columns[i]
    return [String(i + 1), col.consensusBase, ...col.bases].join('\t')
  })
  return [header, ...rows].join('\n') + '\n'
}
