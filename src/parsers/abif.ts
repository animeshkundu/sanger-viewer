import type { Nucleotide, TraceData, TraceMetadata } from '../types/trace'

type Entry = {
  tag: string
  number: number
  elementType: number
  elementSize: number
  count: number
  dataSize: number
  dataOffset: number
}

const CHANNEL_KEYS = ['DATA9', 'DATA10', 'DATA11', 'DATA12'] as const

function readAscii(view: DataView, offset: number, length: number): string {
  const chars: string[] = []
  for (let i = 0; i < length; i += 1) {
    const code = view.getUint8(offset + i)
    if (code === 0) break
    chars.push(String.fromCharCode(code))
  }
  return chars.join('')
}

function parseEntry(view: DataView, offset: number): Entry {
  return {
    tag: readAscii(view, offset, 4),
    number: view.getUint32(offset + 4, false),
    elementType: view.getUint16(offset + 8, false),
    elementSize: view.getUint16(offset + 10, false),
    count: view.getUint32(offset + 12, false),
    dataSize: view.getUint32(offset + 16, false),
    dataOffset: view.getUint32(offset + 20, false)
  }
}

function readEntryBytes(buffer: ArrayBuffer, entry: Entry): Uint8Array {
  const source = new Uint8Array(buffer)
  if (entry.dataSize <= 4) {
    const packed = new ArrayBuffer(4)
    new DataView(packed).setUint32(0, entry.dataOffset, false)
    return new Uint8Array(packed, 0, entry.dataSize)
  }
  return source.slice(entry.dataOffset, entry.dataOffset + entry.dataSize)
}

function readUnsignedArray(buffer: ArrayBuffer, entry: Entry): number[] {
  const bytes = readEntryBytes(buffer, entry)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out: number[] = []

  for (let i = 0; i < entry.count; i += 1) {
    if (entry.elementSize === 1) {
      out.push(view.getUint8(i))
    } else if (entry.elementSize === 2) {
      out.push(view.getUint16(i * 2, false))
    } else if (entry.elementSize === 4) {
      out.push(view.getUint32(i * 4, false))
    }
  }
  return out
}

function readString(buffer: ArrayBuffer, entry: Entry): string {
  const bytes = readEntryBytes(buffer, entry)
  const offset = entry.elementType === 18 ? 1 : 0
  return new TextDecoder().decode(bytes.slice(offset)).replace(/\0+$/g, '')
}

function readOptionalString(buffer: ArrayBuffer, entry: Entry | undefined): string | undefined {
  if (!entry) return undefined
  const value = readString(buffer, entry)
  return value.length > 0 ? value : undefined
}

export function parseAb1(buffer: ArrayBuffer, fileName: string): TraceData {
  const view = new DataView(buffer)
  if (readAscii(view, 0, 4) !== 'ABIF') {
    throw new Error('Invalid AB1 header')
  }

  const root = parseEntry(view, 6)
  const entries = new Map<string, Entry>()
  for (let i = 0; i < root.count; i += 1) {
    const entry = parseEntry(view, root.dataOffset + i * 28)
    entries.set(`${entry.tag}${entry.number}`, entry)
  }

  const fwoEntry = entries.get('FWO_1')
  const order = (fwoEntry ? readString(buffer, fwoEntry) : 'GATC').slice(0, 4)
  const rawChannels = CHANNEL_KEYS.map((key) => {
    const entry = entries.get(key)
    if (!entry) throw new Error(`Missing ${key}`)
    return Float32Array.from(readUnsignedArray(buffer, entry))
  })

  const channels = { A: new Float32Array(), C: new Float32Array(), G: new Float32Array(), T: new Float32Array() }
  for (let i = 0; i < 4; i += 1) {
    const base = order[i] as Nucleotide
    channels[base] = rawChannels[i]
  }

  const pbas = entries.get('PBAS2') ?? entries.get('PBAS1')
  const ploc = entries.get('PLOC2') ?? entries.get('PLOC1')
  if (!pbas || !ploc) {
    throw new Error('AB1 missing required sequence fields')
  }

  const sequence = readString(buffer, pbas)
  const peakPositions = readUnsignedArray(buffer, ploc)
  const qualitiesEntry = entries.get('PCON2') ?? entries.get('PCON1')
  const qualities = qualitiesEntry ? readUnsignedArray(buffer, qualitiesEntry) : null

  // Build metadata from available ABIF tags
  const dyeParts = ['DyeN1', 'DyeN2', 'DyeN3', 'DyeN4']
    .map((key) => readOptionalString(buffer, entries.get(key)))
    .filter((s): s is string => s !== undefined)
  const dyeSet = dyeParts.length > 0 ? dyeParts.join('/') : undefined

  const laneEntry = entries.get('LANE1')
  const lane = laneEntry ? (readUnsignedArray(buffer, laneEntry)[0] ?? undefined) : undefined

  const metadata: TraceMetadata = {
    sampleName: readOptionalString(buffer, entries.get('SMPL1')),
    instrument: readOptionalString(buffer, entries.get('MCHN1')),
    model: readOptionalString(buffer, entries.get('MODL1'))?.trim(),
    runDate: readOptionalString(buffer, entries.get('BCTS1')),
    dyeSet,
    baseCaller: readOptionalString(buffer, entries.get('PDMF1')),
    comment: readOptionalString(buffer, entries.get('CMNT1')),
    lane,
  }

  return {
    format: 'ab1',
    fileName,
    sampleCount: channels.A.length,
    channels,
    baseCalls: sequence.split(''),
    peakPositions,
    qualities,
    sequence,
    metadata,
  }
}
