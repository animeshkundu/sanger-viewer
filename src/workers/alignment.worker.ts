/// <reference lib="webworker" />
/**
 * Web Worker: align a trace read or contig consensus to a plasmid-scale reference.
 *
 * Receives: { readSeq, referenceSeq, referenceId, subjectId, bandwidth }
 * Posts back: { ok: true, alignment } or { ok: false, error }
 */
import { alignReadToReference } from '../alignment/aligner'
import type { ReferenceAlignment } from '../types/alignment'

interface AlignmentWorkerRequest {
  readSeq: string
  referenceSeq: string
  referenceId: string
  subjectId: string
  bandwidth: number
}

self.onmessage = (event: MessageEvent<AlignmentWorkerRequest>) => {
  const { readSeq, referenceSeq, referenceId, subjectId, bandwidth } = event.data
  try {
    const alignment: ReferenceAlignment = alignReadToReference(
      readSeq,
      referenceSeq,
      referenceId,
      subjectId,
      bandwidth,
    )
    self.postMessage({ ok: true, alignment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Alignment error'
    self.postMessage({ ok: false, error: message })
  }
}
