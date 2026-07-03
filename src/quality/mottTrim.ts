/**
 * Mott end-trimming (PHRED quality-based).
 *
 * Algorithm: for each base i, score(i) = quality(i) − threshold.
 * The kept region is the maximum-sum contiguous subsequence of score[]
 * (Kadane's algorithm adapted for a single maximum window).
 * Everything outside that window is "trimmed".
 *
 * References:
 *   Mott (1995) "EST_GENOME: a program to fit EST and genomic DNA sequences"
 *   Biopython SeqIO.QualityIO — phred_quality_trim
 */

export interface TrimResult {
  /**
   * First kept base index, inclusive.
   * 0 when the left end is not trimmed (or when status !== 'ok').
   */
  trimStart: number
  /**
   * One-past-the-last kept base index, exclusive.
   * baseCalls.length when the right end is not trimmed.
   * 0 when status === 'all-trimmed'.
   */
  trimEnd: number
  /** Number of kept bases (trimEnd − trimStart). */
  trimmedLength: number
  /** Mean PHRED quality of the kept bases. NaN when trimmedLength === 0. */
  meanQuality: number
  /**
   * 'ok'          – trim succeeded; boundaries are meaningful.
   * 'no-quality'  – no quality data; full sequence returned, no trimming applied.
   * 'all-trimmed' – every base scored below threshold; nothing kept.
   */
  status: 'ok' | 'no-quality' | 'all-trimmed'
  /** Trimmed (kept) sequence as a string. Empty when all-trimmed. */
  trimmedSequence: string
}

export interface TrimSettings {
  /** PHRED quality threshold (0–40 typical range; default 20). */
  threshold: number
  /** Whether the sequence panel and FASTA export use the full or trimmed sequence. */
  mode: 'full' | 'trimmed'
}

export const DEFAULT_TRIM_SETTINGS: TrimSettings = {
  threshold: 20,
  mode: 'full',
}

/**
 * Apply Mott end-trimming to a base call array using PHRED quality scores.
 *
 * @param qualities   Per-base PHRED quality scores.  null → no-quality result.
 * @param baseCalls   Per-base call strings (same length as qualities when present).
 * @param threshold   PHRED quality threshold (typically 20).
 */
export function mottTrim(
  qualities: number[] | null,
  baseCalls: string[],
  threshold: number,
): TrimResult {
  // No quality data → return the full range with a 'no-quality' status flag.
  if (!qualities || qualities.length === 0) {
    return {
      trimStart: 0,
      trimEnd: baseCalls.length,
      trimmedLength: baseCalls.length,
      meanQuality: NaN,
      status: 'no-quality',
      trimmedSequence: baseCalls.join(''),
    }
  }

  const n = qualities.length

  // Mott / Kadane pass: score[i] = quality[i] − threshold
  let runningSum = 0
  let maxSum = 0
  let windowStart = 0
  let trimStart = 0
  let trimEnd = 0 // exclusive; 0 means "not yet found"

  for (let i = 0; i < n; i++) {
    runningSum += qualities[i] - threshold
    if (runningSum < 0) {
      runningSum = 0
      windowStart = i + 1
    } else if (runningSum > maxSum) {
      maxSum = runningSum
      trimStart = windowStart
      trimEnd = i + 1
    }
  }

  // Every base scored below threshold — nothing kept.
  if (trimEnd === 0) {
    return {
      trimStart: 0,
      trimEnd: 0,
      trimmedLength: 0,
      meanQuality: NaN,
      status: 'all-trimmed',
      trimmedSequence: '',
    }
  }

  // Mean quality over the kept window.
  let qualSum = 0
  for (let i = trimStart; i < trimEnd; i++) qualSum += qualities[i]
  const meanQuality = qualSum / (trimEnd - trimStart)

  return {
    trimStart,
    trimEnd,
    trimmedLength: trimEnd - trimStart,
    meanQuality,
    status: 'ok',
    trimmedSequence: baseCalls.slice(trimStart, trimEnd).join(''),
  }
}
