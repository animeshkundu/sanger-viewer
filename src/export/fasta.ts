import type { TraceData } from '../types/trace'

export function toFasta(trace: TraceData, isRevcomp = false): string {
  const id = trace.fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  const header = isRevcomp ? `>${id}_revcomp [reverse complement]` : `>${id}`
  const lines = trace.sequence.match(/.{1,80}/g) ?? []
  return `${header}\n${lines.join('\n')}\n`
}
