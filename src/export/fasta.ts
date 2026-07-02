import type { TraceData } from '../types/trace'

export function toFasta(trace: TraceData): string {
  const id = trace.fileName.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  const lines = trace.sequence.match(/.{1,80}/g) ?? []
  return `>${id}\n${lines.join('\n')}\n`
}
