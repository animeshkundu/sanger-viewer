import type { TraceData } from '../types/trace'
import type { TrimResult } from '../quality/mottTrim'

/** Maximum Phred quality score representable in Phred+33 ASCII encoding (chr(126) = '~'). */
const MAX_PHRED_SCORE = 93

/**
 * Encode a Phred quality score as a single FASTQ character (Phred+33).
 * Clamps the score to [0, MAX_PHRED_SCORE] so the result is always a printable ASCII character.
 */
function phred33Char(score: number): string {
  return String.fromCharCode(Math.max(0, Math.min(MAX_PHRED_SCORE, Math.round(score))) + 33)
}

/**
 * Build the quality-encoding string for a FASTQ record.
 * When qualities is null every position gets '!' (Phred+33 encoded score 0).
 */
function buildQualLine(qualities: number[] | null, length: number): string {
  if (!qualities) return '!'.repeat(length)
  return qualities.map(phred33Char).join('')
}

/**
 * Export the trace as a FASTQ record (one record, no line-wrapping of sequence).
 *
 * @param trace     The display trace (already strand-flipped and edited if applicable).
 * @param isRevcomp Whether the trace is a reverse complement (appends _revcomp to the ID and adds a header tag).
 * @param trim      Trim result, used when mode === 'trimmed'.
 * @param mode      'full' uses the full sequence; 'trimmed' uses the trimmed subsequence.
 */
export function toFastq(
  trace: TraceData,
  isRevcomp = false,
  trim: TrimResult | null = null,
  mode: 'full' | 'trimmed' = 'full',
): string {
  const id = trace.fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  const fastqId = isRevcomp ? `${id}_revcomp` : id

  const inTrimmedMode = mode === 'trimmed' && trim !== null
  const useTrimmedSequence = inTrimmedMode && (trim.status === 'ok' || trim.status === 'all-trimmed')
  const sequence = useTrimmedSequence ? trim.trimmedSequence : trace.sequence

  // Slice qualities to match the sequence window.
  let qualities: number[] | null = trace.qualities
  if (useTrimmedSequence && trim && trim.status === 'ok' && qualities) {
    qualities = qualities.slice(trim.trimStart, trim.trimEnd)
  }

  const qualLine = buildQualLine(qualities, sequence.length)

  // Build annotation tags for the header comment (same style as FASTA).
  const tags: string[] = []
  if (isRevcomp) tags.push('reverse complement')
  if (inTrimmedMode && trim && trim.status === 'ok') {
    tags.push(`trimmed ${trim.trimStart + 1}–${trim.trimEnd}/${trace.baseCalls.length} bp Q${trim.meanQuality.toFixed(1)}`)
  } else if (inTrimmedMode && trim && trim.status === 'all-trimmed') {
    tags.push(`trimmed all/${trace.baseCalls.length} bp`)
  }

  const header = tags.length > 0 ? `@${fastqId} [${tags.join('; ')}]` : `@${fastqId}`
  return `${header}\n${sequence}\n+\n${qualLine}\n`
}

/**
 * Export Phred quality scores as a .qual file (FASTA-like format with
 * space-separated integer quality scores, 60 values per line).
 */
export function toQual(
  trace: TraceData,
  isRevcomp = false,
  trim: TrimResult | null = null,
  mode: 'full' | 'trimmed' = 'full',
): string {
  const id = trace.fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  const qualId = isRevcomp ? `${id}_revcomp` : id

  const inTrimmedMode = mode === 'trimmed' && trim !== null
  const useTrimmedSequence = inTrimmedMode && (trim.status === 'ok' || trim.status === 'all-trimmed')

  let qualities: number[]
  if (!trace.qualities) {
    const len = useTrimmedSequence && trim && trim.status === 'ok'
      ? trim.trimEnd - trim.trimStart
      : trace.baseCalls.length
    qualities = new Array<number>(len).fill(0)
  } else if (useTrimmedSequence && trim && trim.status === 'ok') {
    qualities = trace.qualities.slice(trim.trimStart, trim.trimEnd)
  } else {
    qualities = trace.qualities
  }

  const tags: string[] = []
  if (isRevcomp) tags.push('reverse complement')
  if (inTrimmedMode && trim && trim.status === 'ok') {
    tags.push(`trimmed ${trim.trimStart + 1}–${trim.trimEnd}/${trace.baseCalls.length} bp Q${trim.meanQuality.toFixed(1)}`)
  } else if (inTrimmedMode && trim && trim.status === 'all-trimmed') {
    tags.push(`trimmed all/${trace.baseCalls.length} bp`)
  }

  const header = tags.length > 0 ? `>${qualId} [${tags.join('; ')}]` : `>${qualId}`

  // 60 values per line, space-separated.
  const lines: string[] = []
  for (let i = 0; i < qualities.length; i += 60) {
    lines.push(qualities.slice(i, i + 60).join(' '))
  }
  return `${header}\n${lines.join('\n')}\n`
}
