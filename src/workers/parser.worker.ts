/// <reference lib="webworker" />
/**
 * Web Worker: parse a trace file off the main thread.
 *
 * Receives: { buffer: ArrayBuffer, fileName: string }
 *   The buffer is transferred (not copied) so the main thread's copy is
 *   neutered after postMessage — that is expected behaviour.
 *
 * Posts back on success:
 *   { ok: true, trace: TraceData }
 *   The four channel Float32Arrays are transferred back so there is no copy.
 *
 * Posts back on failure:
 *   { ok: false, error: string }
 */
import { parseTrace } from '../parsers'
import type { TraceData } from '../types/trace'

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  const { buffer, fileName } = event.data
  try {
    const trace: TraceData = parseTrace(buffer, fileName)
    const transferables: Transferable[] = [
      trace.channels.A.buffer,
      trace.channels.C.buffer,
      trace.channels.G.buffer,
      trace.channels.T.buffer
    ]
    self.postMessage({ ok: true, trace }, transferables)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse error'
    self.postMessage({ ok: false, error: message })
  }
}
