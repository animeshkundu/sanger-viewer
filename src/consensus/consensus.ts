/**
 * consensus.ts — Pure, DOM-free consensus-calling logic for multi-trace views.
 *
 * Algorithm (pinned deterministic):
 *   At each position i (clamped to Math.min of all trace lengths):
 *     1. Count occurrences of each character (case-insensitive).
 *     2. If all traces agree → consensus = that character; NOT a mismatch.
 *     3. Otherwise → mismatch; resolve majority/tied bases via IUPAC table.
 */

export interface ConsensusResult {
  /** The resolved consensus string (one character per position). */
  sequence: string
  /** Length of the consensus (= Math.min of all input sequence lengths). */
  length: number
  /** 0-based positions where the traces do not all agree. */
  mismatches: number[]
  /** Convenience alias for mismatches.length. */
  mismatchCount: number
}

// ── IUPAC ambiguity table ────────────────────────────────────────────────────
// Keys are sorted uppercase nucleotide sets joined as strings.

const IUPAC: Record<string, string> = {
  AC: 'M',
  AG: 'R',
  AT: 'W',
  CG: 'S',
  CT: 'Y',
  GT: 'K',
  ACG: 'V',
  ACT: 'H',
  AGT: 'D',
  CGT: 'B',
  ACGT: 'N',
}

const CANONICAL_ORDER = 'ACGT'

/**
 * Sort a list of bases in canonical IUPAC order (A < C < G < T < other).
 * Within each group the characters are sorted alphabetically.
 */
function sortBases(bases: string[]): string[] {
  return [...bases].sort((a, b) => {
    const ai = CANONICAL_ORDER.indexOf(a)
    const bi = CANONICAL_ORDER.indexOf(b)
    const aRank = ai === -1 ? 4 : ai
    const bRank = bi === -1 ? 4 : bi
    if (aRank !== bRank) return aRank - bRank
    return a < b ? -1 : a > b ? 1 : 0
  })
}

/**
 * Compute a positional (ungapped) consensus from an array of base-call strings.
 *
 * - Empty input → all-zero result.
 * - Single sequence → trivial consensus (no mismatches).
 * - Length is clamped to Math.min of all sequence lengths.
 */
export function computeConsensus(sequences: string[]): ConsensusResult {
  const resident = sequences.filter((s) => typeof s === 'string')
  if (resident.length === 0) {
    return { sequence: '', length: 0, mismatches: [], mismatchCount: 0 }
  }

  const length = Math.min(...resident.map((s) => s.length))
  const result: string[] = []
  const mismatches: number[] = []

  for (let i = 0; i < length; i++) {
    // Build frequency map (case-insensitive, normalise to uppercase).
    const freq = new Map<string, number>()
    for (const seq of resident) {
      const base = seq[i].toUpperCase()
      freq.set(base, (freq.get(base) ?? 0) + 1)
    }

    if (freq.size === 1) {
      // All traces agree — unanimous call, not a mismatch.
      result.push([...freq.keys()][0])
      continue
    }

    // Mismatch: record position and resolve consensus base.
    mismatches.push(i)

    const maxCount = Math.max(...freq.values())
    const tiedBases = sortBases([...freq.entries()].filter(([, c]) => c === maxCount).map(([b]) => b))
    const key = tiedBases.join('')

    // All tied bases are canonical ACGT and the joined key is in the IUPAC table.
    const allCanonical = tiedBases.every((b) => CANONICAL_ORDER.includes(b))
    if (allCanonical && IUPAC[key]) {
      result.push(IUPAC[key])
    } else if (tiedBases.length === 1) {
      result.push(tiedBases[0])
    } else {
      result.push('N')
    }
  }

  return {
    sequence: result.join(''),
    length,
    mismatches,
    mismatchCount: mismatches.length,
  }
}

/**
 * Serialise a ConsensusResult to FASTA format.
 *
 * Header format: `>consensus [N traces: fileName1, fileName2, ...]`
 * Sequence is wrapped at 80 characters per line, ending with a trailing newline.
 */
export function toConsensusFasta(result: ConsensusResult, fileNames: string[]): string {
  const traceList = fileNames.join(', ')
  const header = `>consensus [${fileNames.length} traces: ${traceList}]`
  const lines = result.sequence.match(/.{1,80}/g) ?? []
  return `${header}\n${lines.join('\n')}\n`
}
