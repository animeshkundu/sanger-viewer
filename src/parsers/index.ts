import { parseAb1 } from './abif'
import { parseScf } from './scf'
import type { TraceData } from '../types/trace'

export function detectFormat(buffer: ArrayBuffer): 'ab1' | 'scf' {
  const view = new DataView(buffer)
  const head = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (head === 'ABIF') return 'ab1'
  if (head === '.scf') return 'scf'
  throw new Error('Unsupported trace format. Please use .ab1 or .scf files.')
}

export function parseTrace(buffer: ArrayBuffer, fileName: string): TraceData {
  const format = detectFormat(buffer)
  return format === 'ab1' ? parseAb1(buffer, fileName) : parseScf(buffer, fileName)
}
