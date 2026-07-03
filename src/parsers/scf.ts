import type { TraceData, TraceMetadata } from '../types/trace'

function decodeDelta(values: Float32Array): Float32Array {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 1; i < values.length; i += 1) {
      values[i] += values[i - 1]
    }
  }
  return values
}

export function parseScf(buffer: ArrayBuffer, fileName: string): TraceData {
  const view = new DataView(buffer)
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (magic !== '.scf') {
    throw new Error('Invalid SCF header')
  }

  const samples = view.getUint32(4, false)
  const sampleOffset = view.getUint32(8, false)
  const bases = view.getUint32(12, false)
  const baseOffset = view.getUint32(24, false)
  const version = Number.parseFloat(new TextDecoder().decode(new Uint8Array(buffer.slice(36, 40))))
  const sampleSize = view.getUint32(40, false)

  const channels = {
    A: new Float32Array(samples),
    C: new Float32Array(samples),
    G: new Float32Array(samples),
    T: new Float32Array(samples)
  }

  if (version >= 3) {
    const read = (channel: Float32Array, startOffset: number) => {
      for (let i = 0; i < samples; i += 1) {
        const offset = startOffset + i * sampleSize
        channel[i] = sampleSize === 1 ? view.getUint8(offset) : view.getUint16(offset, false)
      }
      decodeDelta(channel)
    }

    read(channels.A, sampleOffset)
    read(channels.C, sampleOffset + samples * sampleSize)
    read(channels.G, sampleOffset + samples * sampleSize * 2)
    read(channels.T, sampleOffset + samples * sampleSize * 3)
  } else {
    for (let i = 0; i < samples; i += 1) {
      const row = sampleOffset + i * sampleSize * 4
      channels.A[i] = sampleSize === 1 ? view.getUint8(row) : view.getUint16(row, false)
      channels.C[i] = sampleSize === 1 ? view.getUint8(row + sampleSize) : view.getUint16(row + sampleSize, false)
      channels.G[i] = sampleSize === 1 ? view.getUint8(row + sampleSize * 2) : view.getUint16(row + sampleSize * 2, false)
      channels.T[i] = sampleSize === 1 ? view.getUint8(row + sampleSize * 3) : view.getUint16(row + sampleSize * 3, false)
    }
  }

  const baseCalls: string[] = []
  const peakPositions: number[] = []
  const qualities: number[] = []

  for (let i = 0; i < bases; i += 1) {
    const offset = baseOffset + i * 12
    const peakIndex = view.getUint32(offset, false)
    const probs = {
      A: view.getUint8(offset + 4),
      C: view.getUint8(offset + 5),
      G: view.getUint8(offset + 6),
      T: view.getUint8(offset + 7)
    }
    const rawBase = view.getUint8(offset + 8)
    const base = rawBase === 0 ? 'N' : String.fromCharCode(rawBase).toUpperCase()
    baseCalls.push(base)
    peakPositions.push(peakIndex)
    qualities.push(probs[base as keyof typeof probs] ?? 0)
  }

  const metadata: TraceMetadata = { version: Number.isFinite(version) ? version : 0 }

  return {
    format: 'scf',
    fileName,
    sampleCount: samples,
    channels,
    baseCalls,
    peakPositions,
    qualities,
    sequence: baseCalls.join(''),
    metadata,
  }
}
