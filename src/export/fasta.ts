import type { TraceData } from '../types/trace'
import type { TrimResult } from '../quality/mottTrim'

export function toFasta(
  trace: TraceData,
  isRevcomp = false,
  trim: TrimResult | null = null,
  mode: 'full' | 'trimmed' = 'full',
): string {
  const id = trace.fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  // Keep the _revcomp suffix in the FASTA ID (backward-compatible with existing tests/tooling).
  const fastaId = isRevcomp ? `${id}_revcomp` : id

  const inTrimmedMode = mode === 'trimmed' && trim !== null
  const useTrimmedSequence = inTrimmedMode && (trim.status === 'ok' || trim.status === 'all-trimmed')
  const sequence = useTrimmedSequence ? trim.trimmedSequence : trace.sequence

  // Build annotation tags for the header comment.
  const tags: string[] = []
  if (isRevcomp) tags.push('reverse complement')
  if (inTrimmedMode && trim && trim.status === 'ok') {
    tags.push(`trimmed ${trim.trimStart + 1}–${trim.trimEnd}/${trace.baseCalls.length} bp Q${trim.meanQuality.toFixed(1)}`)
  } else if (inTrimmedMode && trim && trim.status === 'all-trimmed') {
    tags.push(`trimmed 0–0/${trace.baseCalls.length} bp`)
  }

  const header = tags.length > 0 ? `>${fastaId} [${tags.join('; ')}]` : `>${fastaId}`
  const lines = sequence.match(/.{1,80}/g) ?? []
  return `${header}\n${lines.join('\n')}\n`
}
