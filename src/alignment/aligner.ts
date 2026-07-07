/**
 * aligner.ts — Banded semi-global Needleman-Wunsch alignment engine.
 *
 * Semi-global: free end-gaps on the read (read is allowed to start/end anywhere
 * in the reference without penalty), but full penalties on the reference ends.
 * This models Sanger reads aligning to a larger reference.
 *
 * Auto-detects strand: aligns the read on forward, then reverse-complement,
 * and returns the best-scoring placement.
 *
 * Plasmid-scale path: a typed-array semi-global DP evaluates every possible
 * read placement so reads can align anywhere within <=10KB references.
 *
 * Ground spec: docs/specs/07-reference-alignment.md
 */

import type { ReferenceAlignment } from '../types/alignment'
import { reverseComplement } from './iupac'
import { buildCigar, parseCigar, cigarRefLength } from './cigar'
import type { CigarOp } from './cigar'

const GAP = -2
const TRACE_DIAG = 1
const TRACE_UP = 2
const TRACE_LEFT = 3

interface AlignResult {
  score: number
  cigar: string
  refStart: number   // 0-based
  refEnd: number     // 0-based inclusive
  mismatches: number[]
  insertions: number[]
  deletions: number[]
}

/**
 * Perform typed-array semi-global (read vs. reference) Needleman-Wunsch.
 * The read may be placed anywhere along the reference.
 *
 * @param read      Query sequence (uppercase).
 * @param reference Reference sequence (uppercase).
 * @returns Best-scoring alignment result.
 */
function semiGlobal(read: string, reference: string): AlignResult {
  const n = read.length
  const m = reference.length

  if (n === 0 || m === 0) {
    return { score: 0, cigar: '', refStart: 0, refEnd: 0, mismatches: [], insertions: [], deletions: [] }
  }

  const width = m + 1
  const prev = new Int16Array(width)
  const curr = new Int16Array(width)
  const trace = new Uint8Array((n + 1) * width)
  const readCodes = encodeBases(read)
  const refCodes = encodeBases(reference)

  for (let i = 1; i <= n; i++) {
    curr[0] = i * GAP
    const row = i * width
    const rb = readCodes[i - 1]

    for (let j = 1; j <= m; j++) {
      const diag = prev[j - 1] + scoreCode(rb, refCodes[j - 1])
      const up = prev[j] + GAP
      const left = curr[j - 1] + GAP

      if (diag >= up && diag >= left) {
        curr[j] = diag
        trace[row + j] = TRACE_DIAG
      } else if (up >= left) {
        curr[j] = up
        trace[row + j] = TRACE_UP
      } else {
        curr[j] = left
        trace[row + j] = TRACE_LEFT
      }
    }

    prev.set(curr)
  }

  // ── Find best ending position (last row, free end-gaps on read) ──────────
  let bestScore = prev[0]
  let bestJ = 0
  for (let j = 0; j <= m; j++) {
    const v = prev[j]
    if (v > bestScore) { bestScore = v; bestJ = j }
  }

  // ── Traceback ────────────────────────────────────────────────────────────
  const ops: CigarOp[] = []
  let readIdx = n
  let refIdx = bestJ

  while (readIdx > 0) {
    if (refIdx <= 0) {
      ops.push('I')
      readIdx--
      continue
    }

    const direction = trace[readIdx * width + refIdx]
    if (direction === TRACE_DIAG) {
      ops.push('M')
      readIdx--; refIdx--
    } else if (direction === TRACE_UP) {
      ops.push('I')  // gap in reference (insertion in read)
      readIdx--
    } else if (direction === TRACE_LEFT) {
      ops.push('D')  // gap in read (deletion from read)
      refIdx--
    } else {
      ops.push('M')
      readIdx--; refIdx--
    }
  }

  ops.reverse()
  const cigar = buildCigar(ops)

  // ── Compute mismatch / insertion / deletion positions ────────────────────
  const mismatches: number[] = []
  const insertions: number[] = []
  const deletions: number[] = []

  const refStart = refIdx   // 0-based; refIdx stopped before the alignment started
  let readPos = 0
  let refPos = 0

  for (const seg of parseCigar(cigar)) {
    for (let k = 0; k < seg.len; k++) {
      if (seg.op === 'M') {
        const rb = read[readPos]?.toUpperCase()
        const fb = reference[refStart + refPos]?.toUpperCase()
        if (rb && fb && rb !== 'N' && fb !== 'N' && rb !== fb) {
          const score = scoreCode(codeForBase(rb), codeForBase(fb))
          if (score < 0) {
            mismatches.push(readPos)
          } else if (score === 1) {
            // Partial/ambiguous match — count as mismatch for variant calling
            mismatches.push(readPos)
          }
        }
        readPos++
        refPos++
      } else if (seg.op === 'I') {
        insertions.push(readPos)
        readPos++
      } else if (seg.op === 'D') {
        deletions.push(refPos)
        refPos++
      }
    }

    function codeForBase(base: string): number {
      switch (base.toUpperCase()) {
        case 'A': return 1
        case 'C': return 2
        case 'G': return 4
        case 'T':
        case 'U': return 8
        case 'R': return 1 | 4
        case 'Y': return 2 | 8
        case 'S': return 2 | 4
        case 'W': return 1 | 8
        case 'K': return 4 | 8
        case 'M': return 1 | 2
        case 'B': return 2 | 4 | 8
        case 'D': return 1 | 4 | 8
        case 'H': return 1 | 2 | 8
        case 'V': return 1 | 2 | 4
        case 'N': return 1 | 2 | 4 | 8
        default: return 1 | 2 | 4 | 8
      }
    }

    function encodeBases(sequence: string): Uint8Array {
      const out = new Uint8Array(sequence.length)
      for (let i = 0; i < sequence.length; i++) out[i] = codeForBase(sequence[i])
      return out
    }

    function scoreCode(a: number, b: number): number {
      if (a === b && (a === 1 || a === 2 || a === 4 || a === 8)) return 2
      return (a & b) !== 0 ? 1 : -1
    }
  }

  const cigarSegs = parseCigar(cigar)
  const refConsumed = cigarRefLength(cigarSegs)
  const refEnd = refStart + refConsumed - 1   // 0-based inclusive

  return {
    score: bestScore,
    cigar,
    refStart,
    refEnd,
    mismatches,
    insertions,
    deletions,
  }
}

let _idCounter = 0
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  _idCounter += 1
  return `aln-${_idCounter.toString(36)}-${Date.now().toString(36)}`
}

/**
 * Align a read sequence to a reference sequence.
 *
 * Tries both forward and reverse-complement orientations and returns the
 * best-scoring placement as a `ReferenceAlignment`.
 *
 * @param read          Called-base sequence from the trace (may contain IUPAC codes).
 * @param reference     Reference sequence to align against (FASTA body, no header).
 * @param referenceId   Name/id of the reference record.
 * @param subjectId     Slot id of the trace.
 * @param bandwidth     Banding half-width; default 15.
 */
export function alignReadToReference(
  read: string,
  reference: string,
  referenceId: string,
  subjectId: string,
  bandwidth = 15,
): ReferenceAlignment {
  const cleanRef = reference.toUpperCase().replace(/[^ACGTURYSWKMBDHVN]/g, 'N')
  const cleanRead = read.toUpperCase().replace(/[^ACGTURYSWKMBDHVN]/g, 'N')

  void bandwidth
  const fwdResult = semiGlobal(cleanRead, cleanRef)
  const rcRead = reverseComplement(cleanRead)
  const revResult = semiGlobal(rcRead, cleanRef)

  const useFwd = fwdResult.score >= revResult.score
  const best = useFwd ? fwdResult : revResult

  return {
    id: generateId(),
    subjectId,
    referenceId,
    strand: useFwd ? 'forward' : 'reverse',
    refStart: best.refStart + 1,   // convert to 1-based
    refEnd: best.refEnd + 1,       // convert to 1-based
    cigar: best.cigar,
    score: best.score,
    mismatches: best.mismatches,
    insertions: best.insertions,
    deletions: best.deletions,
  }
}

/**
 * Parse a FASTA string and return the sequence (header stripped, newlines removed).
 * Supports single-record FASTA only.
 */
export function parseFastaSequence(fasta: string): { name: string; sequence: string } {
  const lines = fasta.trim().split('\n')
  const header = lines[0] ?? ''
  const name = header.startsWith('>') ? header.slice(1).trim().split(/\s+/)[0] ?? 'reference' : 'reference'
  const sequence = lines
    .slice(header.startsWith('>') ? 1 : 0)
    .join('')
    .replace(/\s/g, '')
    .toUpperCase()
  return { name, sequence }
}
