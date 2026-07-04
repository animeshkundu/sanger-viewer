/**
 * cigar.ts — CIGAR string builder, parser, and coordinate mapper.
 *
 * Supported ops: M (match/mismatch), I (insertion to ref), D (deletion from ref), S (soft-clip).
 *
 * Coordinate conventions:
 *   refPos  — 0-based index into the reference substring that was aligned.
 *   readPos — 0-based index into the read sequence.
 */

export type CigarOp = 'M' | 'I' | 'D' | 'S'
export interface CigarSegment {
  len: number
  op: CigarOp
}

/** Parse a CIGAR string into an array of {len, op} segments. */
export function parseCigar(cigar: string): CigarSegment[] {
  const segments: CigarSegment[] = []
  const re = /(\d+)([MIDS])/g
  let match: RegExpExecArray | null
  while ((match = re.exec(cigar)) !== null) {
    const len = parseInt(match[1], 10)
    const op = match[2] as CigarOp
    if (len > 0) segments.push({ len, op })
  }
  return segments
}

/** Build a CIGAR string from a sequence of raw ops (e.g., from traceback). */
export function buildCigar(ops: CigarOp[]): string {
  if (ops.length === 0) return ''
  const segments: CigarSegment[] = []
  let current: CigarSegment = { len: 1, op: ops[0] }
  for (let i = 1; i < ops.length; i++) {
    if (ops[i] === current.op) {
      current.len++
    } else {
      segments.push(current)
      current = { len: 1, op: ops[i] }
    }
  }
  segments.push(current)
  return segments.map(({ len, op }) => `${len}${op}`).join('')
}

/**
 * Map a 0-based read position to the corresponding 0-based reference position.
 * Returns null when the read position falls in an insertion (no ref base consumed).
 *
 * @param cigar  Parsed CIGAR segments.
 * @param readPos  0-based index into the read.
 */
export function readPosToRefPos(cigar: CigarSegment[], readPos: number): number | null {
  let refPos = 0
  let readIdx = 0
  for (const { len, op } of cigar) {
    if (op === 'M') {
      if (readPos < readIdx + len) return refPos + (readPos - readIdx)
      refPos += len
      readIdx += len
    } else if (op === 'I') {
      if (readPos < readIdx + len) return null   // insertion — no ref coordinate
      readIdx += len
    } else if (op === 'D') {
      refPos += len
    } else if (op === 'S') {
      if (readPos < readIdx + len) return null   // soft-clipped — outside alignment
      readIdx += len
    }
  }
  return null
}

/**
 * Map a 0-based reference position (relative to alignment start) to the
 * corresponding 0-based read position.
 * Returns null when the reference position is consumed by a deletion.
 *
 * @param cigar  Parsed CIGAR segments.
 * @param refPos  0-based index relative to alignment refStart.
 */
export function refPosToReadPos(cigar: CigarSegment[], refPos: number): number | null {
  let refIdx = 0
  let readIdx = 0
  for (const { len, op } of cigar) {
    if (op === 'M') {
      if (refPos < refIdx + len) return readIdx + (refPos - refIdx)
      refIdx += len
      readIdx += len
    } else if (op === 'I') {
      readIdx += len
    } else if (op === 'D') {
      if (refPos < refIdx + len) return null   // deleted — no read base
      refIdx += len
    } else if (op === 'S') {
      readIdx += len
    }
  }
  return null
}

/**
 * Compute the number of reference bases consumed by a CIGAR string.
 * (Sum of lengths for M and D ops.)
 */
export function cigarRefLength(cigar: CigarSegment[]): number {
  return cigar.reduce((acc, { len, op }) => (op === 'M' || op === 'D' ? acc + len : acc), 0)
}

/**
 * Compute the number of read bases consumed by a CIGAR string.
 * (Sum of lengths for M, I, and S ops.)
 */
export function cigarReadLength(cigar: CigarSegment[]): number {
  return cigar.reduce((acc, { len, op }) => (op === 'M' || op === 'I' || op === 'S' ? acc + len : acc), 0)
}
