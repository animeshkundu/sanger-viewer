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
 * Banding: only cells within `bandwidth` diagonals of the main diagonal are
 * computed, giving O(n·band) time/space instead of O(n·m).
 *
 * Ground spec: docs/specs/07-reference-alignment.md
 */

import type { ReferenceAlignment } from '../types/alignment'
import { iupacScore, reverseComplement } from './iupac'
import { buildCigar, parseCigar, cigarRefLength } from './cigar'
import type { CigarOp } from './cigar'

const GAP_OPEN = -2
const GAP_EXTEND = -1

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
 * Perform banded semi-global (read vs. reference) Needleman-Wunsch.
 * The read may be placed anywhere along the reference.
 *
 * @param read      Query sequence (uppercase).
 * @param reference Reference sequence (uppercase).
 * @param bandwidth Half-band (diagonals either side of the main); default 15.
 * @returns Best-scoring alignment result.
 */
function bandedSemiGlobal(read: string, reference: string, bandwidth = 15): AlignResult {
  const n = read.length
  const m = reference.length

  if (n === 0 || m === 0) {
    return { score: 0, cigar: '', refStart: 0, refEnd: 0, mismatches: [], insertions: [], deletions: [] }
  }

  // ── DP matrices ───────────────────────────────────────────────────────────
  // We use a flat array indexed [i*(m+1) + j] but only fill within the band.
  // Semi-global: first row (j=0 for each i) is gapped freely (read can start anywhere).
  const NEG_INF = -1e9
  const H = new Float32Array((n + 1) * (m + 1)).fill(NEG_INF)

  // Initialise: free gap at the start of the read (row i=0, any ref position j)
  for (let j = 0; j <= m; j++) H[j] = 0

  // Column 0 penalises opening a gap in the read (read starts from base 0)
  for (let i = 1; i <= n; i++) H[i * (m + 1)] = GAP_OPEN + GAP_EXTEND * (i - 1)

  // ── Fill ────────────────────────────────────────────────────────────────
  for (let i = 1; i <= n; i++) {
    const jLo = Math.max(1, i - bandwidth)
    const jHi = Math.min(m, i + bandwidth)
    for (let j = jLo; j <= jHi; j++) {
      const diag = H[(i - 1) * (m + 1) + (j - 1)] + iupacScore(read[i - 1], reference[j - 1])
      const gapRead = H[(i - 1) * (m + 1) + j] + (i > 1 && H[(i - 1) * (m + 1) + j] !== NEG_INF ? GAP_EXTEND : GAP_OPEN)
      const gapRef = H[i * (m + 1) + (j - 1)] + (j > 1 && H[i * (m + 1) + (j - 1)] !== NEG_INF ? GAP_EXTEND : GAP_OPEN)
      H[i * (m + 1) + j] = Math.max(diag, gapRead, gapRef)
    }
  }

  // ── Find best ending position (last row, free end-gaps on read) ──────────
  let bestScore = NEG_INF
  let bestJ = m
  for (let j = 0; j <= m; j++) {
    const v = H[n * (m + 1) + j]
    if (v > bestScore) { bestScore = v; bestJ = j }
  }

  // ── Traceback ────────────────────────────────────────────────────────────
  const ops: CigarOp[] = []
  let readIdx = n
  let refIdx = bestJ

  while (readIdx > 0 && refIdx > 0) {
    const cur = H[readIdx * (m + 1) + refIdx]
    const diag = H[(readIdx - 1) * (m + 1) + (refIdx - 1)]
    const up   = H[(readIdx - 1) * (m + 1) + refIdx]
    const left = H[readIdx * (m + 1) + (refIdx - 1)]

    const diagScore = diag + iupacScore(read[readIdx - 1], reference[refIdx - 1])
    if (Math.abs(cur - diagScore) < 0.5) {
      ops.push('M')
      readIdx--; refIdx--
    } else if (Math.abs(cur - (up + GAP_EXTEND)) < 0.5 || Math.abs(cur - (up + GAP_OPEN)) < 0.5) {
      ops.push('I')  // gap in reference (insertion in read)
      readIdx--
    } else if (Math.abs(cur - (left + GAP_EXTEND)) < 0.5 || Math.abs(cur - (left + GAP_OPEN)) < 0.5) {
      ops.push('D')  // gap in read (deletion from read)
      refIdx--
    } else {
      // Fallback: diagonal
      ops.push('M')
      readIdx--; refIdx--
    }
  }

  // Consume remaining read bases as insertions (soft-clip not used in NW)
  while (readIdx > 0) { ops.push('I'); readIdx-- }

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
          // IUPAC-aware: check if they actually mismatch
          if (!iupacScore(rb, fb) || iupacScore(rb, fb) < 0) {
            mismatches.push(readPos)
          } else if (iupacScore(rb, fb) === 1) {
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

  const fwdResult = bandedSemiGlobal(cleanRead, cleanRef, bandwidth)
  const rcRead = reverseComplement(cleanRead)
  const revResult = bandedSemiGlobal(rcRead, cleanRef, bandwidth)

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
