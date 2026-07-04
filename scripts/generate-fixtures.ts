/**
 * scripts/generate-fixtures.ts
 *
 * Deterministic ABIF synthetic fixture generator.
 *
 * Run once (output already committed):
 *   node --experimental-strip-types scripts/generate-fixtures.ts
 *
 * Provenance
 * ----------
 * All four output files are PURELY SYNTHETIC — no real patient or lab data.
 * Signal model: per-base Gaussian bump centred on the peak position; amplitude
 * and noise drawn from a seeded Linear Congruential Generator (LCG) so the
 * same seed always produces identical bytes.
 *
 * LCG parameters (Numerical Recipes):
 *   state_{n+1} = (1664525 * state_n + 1013904223) mod 2^32
 *
 * Fixture parameters
 * ------------------
 * | File                        | Bases | Samples/base | Samples total | Quality range |
 * |-----------------------------|-------|--------------|---------------|---------------|
 * | synth-small-500bp.ab1       |   500 |           10 |         5 000 | Phred 20–40   |
 * | synth-large-3kbp.ab1        | 3 000 |           10 |        30 000 | Phred 20–40   |
 * | synth-lowq-800bp.ab1        |   800 |           10 |         8 000 | Phred  5–15   |
 * | synth-longread-5kbp.ab1     | 5 000 |           10 |        50 000 | Phred 15–35   |
 *
 * Binary layout (ABIF format)
 * ---------------------------
 * Offset 0–3  : magic "ABIF"
 * Offset 4–5  : version = 101 (uint16 big-endian)
 * Offset 6–33 : root directory entry (28 bytes)
 * Offset 34   : directory entries (8 × 28 bytes = 224 bytes)
 * Offset 258  : data sections (channel arrays, sequence, peaks, quality)
 *
 * Directory entries (8 entries):
 *   FWO_1  – channel order "GATC" (4 bytes inline in dataOffset)
 *   DATA9  – G-channel uint16 array
 *   DATA10 – A-channel uint16 array
 *   DATA11 – T-channel uint16 array
 *   DATA12 – C-channel uint16 array
 *   PBAS2  – base-call ASCII string
 *   PLOC2  – peak positions uint16 array
 *   PCON2  – PHRED quality uint8 array
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// LCG — deterministic pseudo-random number generator
// ---------------------------------------------------------------------------

class LCG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
}

// ---------------------------------------------------------------------------
// Signal model — Gaussian bump
// ---------------------------------------------------------------------------

function gaussian(x: number, center: number, sigma: number): number {
  const d = x - center
  return Math.exp(-(d * d) / (2 * sigma * sigma))
}

// ---------------------------------------------------------------------------
// Trace synthesis
// ---------------------------------------------------------------------------

type ChannelKey = 'A' | 'C' | 'G' | 'T'

interface SynthTrace {
  bases: string
  peakPositions: number[]
  qualities: number[]
  channelG: Uint16Array
  channelA: Uint16Array
  channelT: Uint16Array
  channelC: Uint16Array
}

function synthesiseTrace(params: {
  numBases: number
  samplesPerBase: number
  qualMin: number
  qualMax: number
  seed: number
}): SynthTrace {
  const { numBases, samplesPerBase, qualMin, qualMax, seed } = params
  const rng = new LCG(seed)
  const numSamples = numBases * samplesPerBase
  const BASES: ChannelKey[] = ['A', 'C', 'G', 'T']

  const baseSeq: string[] = []
  const peakPositions: number[] = []
  const qualities: number[] = []
  const channels: Record<ChannelKey, number[]> = {
    A: new Array<number>(numSamples).fill(0),
    C: new Array<number>(numSamples).fill(0),
    G: new Array<number>(numSamples).fill(0),
    T: new Array<number>(numSamples).fill(0),
  }

  const sigma = samplesPerBase / 3.5
  const spreadSamples = Math.ceil(samplesPerBase * 2)

  for (let i = 0; i < numBases; i++) {
    const base = BASES[rng.nextInt(0, 3)]
    baseSeq.push(base)

    const peakPos = Math.round(i * samplesPerBase + samplesPerBase / 2)
    peakPositions.push(peakPos)
    qualities.push(rng.nextInt(qualMin, qualMax))

    const mainAmp = rng.nextInt(1000, 3000)
    const start = Math.max(0, peakPos - spreadSamples)
    const end = Math.min(numSamples - 1, peakPos + spreadSamples)

    for (let s = start; s <= end; s++) {
      const g = gaussian(s, peakPos, sigma)
      channels[base][s] = Math.round(channels[base][s] + mainAmp * g)
      // Cross-talk noise on other channels
      for (const b of BASES) {
        if (b !== base) {
          const noiseAmp = rng.nextInt(30, 180)
          channels[b][s] = Math.round(channels[b][s] + noiseAmp * g * rng.next())
        }
      }
    }
  }

  // Clamp to uint16 range
  const clamp = (arr: number[]): Uint16Array =>
    Uint16Array.from(arr.map((v) => Math.min(65535, Math.max(0, Math.round(v)))))

  return {
    bases: baseSeq.join(''),
    peakPositions,
    qualities,
    channelG: clamp(channels.G),
    channelA: clamp(channels.A),
    channelT: clamp(channels.T),
    channelC: clamp(channels.C),
  }
}

// ---------------------------------------------------------------------------
// ABIF binary writer
// ---------------------------------------------------------------------------

/**
 * Build a minimal but valid ABIF binary buffer that the sanger-viewer ABIF
 * parser understands.  Only the tags required by the parser are written.
 *
 * ABIF entry type codes used here:
 *   1  = byte   (uint8)
 *   2  = char   (ASCII, no length prefix)
 *   4  = short  (uint16 big-endian)
 * 1023 = directory root special type
 */
function buildAbifBuffer(trace: SynthTrace): ArrayBuffer {
  const numBases = trace.bases.length
  const numSamples = trace.channelG.length

  // All data goes into a single flat buffer built up in sections.
  // Layout after the 258-byte header+directory region:
  //   section 0: DATA9  (G), uint16, numSamples * 2 bytes
  //   section 1: DATA10 (A), uint16, numSamples * 2 bytes
  //   section 2: DATA11 (T), uint16, numSamples * 2 bytes
  //   section 3: DATA12 (C), uint16, numSamples * 2 bytes
  //   section 4: PBAS2  (bases), uint8, numBases bytes
  //   section 5: PLOC2  (peaks), uint16, numBases * 2 bytes
  //   section 6: PCON2  (quality), uint8, numBases bytes

  const HEADER_SIZE = 6 // "ABIF" + version uint16
  const ENTRY_SIZE = 28
  const NUM_ENTRIES = 8 // FWO_1, DATA9–12, PBAS2, PLOC2, PCON2
  const DIRECTORY_OFFSET = HEADER_SIZE + ENTRY_SIZE // root entry at 6, dir at 34
  const DATA_OFFSET = DIRECTORY_OFFSET + NUM_ENTRIES * ENTRY_SIZE // = 34 + 224 = 258

  const channelBytes = numSamples * 2
  const peakBytes = numBases * 2
  const totalSize =
    DATA_OFFSET +
    channelBytes * 4 + // DATA9–12
    numBases + // PBAS2
    peakBytes + // PLOC2
    numBases // PCON2

  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  // Helper: write 4-char ASCII tag
  function writeTag(offset: number, tag: string): void {
    for (let i = 0; i < 4; i++) u8[offset + i] = tag.charCodeAt(i)
  }

  // Helper: write a 28-byte directory entry
  function writeEntry(
    entryIndex: number,
    tag: string,
    number: number,
    elementType: number,
    elementSize: number,
    count: number,
    dataSize: number,
    dataOffset: number,
  ): void {
    const base = DIRECTORY_OFFSET + entryIndex * ENTRY_SIZE
    writeTag(base, tag)
    view.setUint32(base + 4, number, false)
    view.setUint16(base + 8, elementType, false)
    view.setUint16(base + 10, elementSize, false)
    view.setUint32(base + 12, count, false)
    view.setUint32(base + 16, dataSize, false)
    view.setUint32(base + 20, dataOffset, false)
    // bytes 24–27 reserved, left as zero
  }

  // Helper: write uint16 array into buffer
  function writeUint16Array(offset: number, arr: Uint16Array): void {
    for (let i = 0; i < arr.length; i++) {
      view.setUint16(offset + i * 2, arr[i], false)
    }
  }

  // --- Header ---
  writeTag(0, 'ABIF')
  view.setUint16(4, 101, false) // version 101

  // --- Root entry (at offset 6) ---
  writeTag(6, 'tdir')
  view.setUint32(10, 1023, false) // elementType = root
  view.setUint16(14, 1, false) // number
  view.setUint16(16, ENTRY_SIZE, false) // elementSize = 28
  view.setUint32(18, NUM_ENTRIES, false) // count
  view.setUint32(22, NUM_ENTRIES * ENTRY_SIZE, false) // dataSize
  view.setUint32(26, DIRECTORY_OFFSET, false) // dataOffset

  // Root entry is 28 bytes at offsets 6–33; the above writes to [6..29].
  // Field layout for parseEntry(view, 6):
  //   tag         = view bytes [6..9]  → 'tdir'
  //   number      = view.getUint32(10) → set to 1023 (reused as number field here)
  // Wait — parseEntry reads:
  //   tag  = readAscii(view, offset, 4)           → offset 6..9
  //   number = view.getUint32(offset+4)            → offset 10
  //   elementType = view.getUint16(offset+8)       → offset 14
  //   elementSize = view.getUint16(offset+10)      → offset 16
  //   count   = view.getUint32(offset+12)          → offset 18
  //   dataSize= view.getUint32(offset+16)          → offset 22
  //   dataOffset= view.getUint32(offset+20)        → offset 26

  // Let me fix root entry layout correctly:
  // The root entry is 28 bytes starting at offset 6.
  // parseEntry(view, 6) reads:
  //   tag     at offset 6       (4 bytes)
  //   number  at offset 6+4=10  (uint32)
  //   elementType at 6+8=14     (uint16)
  //   elementSize at 6+10=16    (uint16)
  //   count   at 6+12=18        (uint32)
  //   dataSize at 6+16=22       (uint32)
  //   dataOffset at 6+20=26     (uint32)

  // The parser uses root.count and root.dataOffset from the entry:
  //   root.count = view.getUint32(18) → NUM_ENTRIES
  //   root.dataOffset = view.getUint32(26) → DIRECTORY_OFFSET

  // I wrote setUint32(10, 1023) → that sets the "number" field
  // and setUint16(14, 1) → that sets "elementType" = 1 which is fine for root
  // But I also setUint32(18, NUM_ENTRIES) → "count" ✓
  // and setUint32(22, dataSize) → "dataSize" ✓
  // and setUint32(26, DIRECTORY_OFFSET) → "dataOffset" ✓

  // Data section offsets
  let sectionOffset = DATA_OFFSET

  const offG = sectionOffset
  sectionOffset += channelBytes

  const offA = sectionOffset
  sectionOffset += channelBytes

  const offT = sectionOffset
  sectionOffset += channelBytes

  const offC = sectionOffset
  sectionOffset += channelBytes

  const offBases = sectionOffset
  sectionOffset += numBases

  const offPeaks = sectionOffset
  sectionOffset += peakBytes

  const offQual = sectionOffset

  // --- Directory entries ---
  // FWO_1: channel order "GATC" stored inline (dataSize=4, packed in dataOffset)
  // "GATC" as big-endian uint32: G=0x47, A=0x41, T=0x54, C=0x43 → 0x47415443
  writeEntry(0, 'FWO_', 1, 2, 1, 4, 4, 0x47415443)

  // DATA9 = G channel
  writeEntry(1, 'DATA', 9, 4, 2, numSamples, channelBytes, offG)
  // DATA10 = A channel
  writeEntry(2, 'DATA', 10, 4, 2, numSamples, channelBytes, offA)
  // DATA11 = T channel
  writeEntry(3, 'DATA', 11, 4, 2, numSamples, channelBytes, offT)
  // DATA12 = C channel
  writeEntry(4, 'DATA', 12, 4, 2, numSamples, channelBytes, offC)

  // PBAS2: base sequence (ASCII chars, elementType=2 no prefix byte)
  writeEntry(5, 'PBAS', 2, 2, 1, numBases, numBases, offBases)

  // PLOC2: peak positions (uint16)
  writeEntry(6, 'PLOC', 2, 4, 2, numBases, peakBytes, offPeaks)

  // PCON2: quality (uint8)
  writeEntry(7, 'PCON', 2, 1, 1, numBases, numBases, offQual)

  // --- Data sections ---
  writeUint16Array(offG, trace.channelG)
  writeUint16Array(offA, trace.channelA)
  writeUint16Array(offT, trace.channelT)
  writeUint16Array(offC, trace.channelC)

  // Base sequence (ASCII)
  for (let i = 0; i < numBases; i++) u8[offBases + i] = trace.bases.charCodeAt(i)

  // Peak positions (uint16)
  for (let i = 0; i < numBases; i++) {
    view.setUint16(offPeaks + i * 2, trace.peakPositions[i], false)
  }

  // Quality (uint8)
  for (let i = 0; i < numBases; i++) u8[offQual + i] = trace.qualities[i]

  return buf
}

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

const FIXTURES = [
  {
    file: 'fixtures/ab1/synth-small-500bp.ab1',
    numBases: 500,
    samplesPerBase: 10,
    qualMin: 20,
    qualMax: 40,
    seed: 0xdeadbeef,
  },
  {
    file: 'fixtures/large/synth-large-3kbp.ab1',
    numBases: 3000,
    samplesPerBase: 10,
    qualMin: 20,
    qualMax: 40,
    seed: 0xcafebabe,
  },
  {
    file: 'fixtures/large/synth-lowq-800bp.ab1',
    numBases: 800,
    samplesPerBase: 10,
    qualMin: 5,
    qualMax: 15,
    seed: 0xbaadf00d,
  },
  {
    file: 'fixtures/large/synth-longread-5kbp.ab1',
    numBases: 5000,
    samplesPerBase: 10,
    qualMin: 15,
    qualMax: 35,
    seed: 0x0facade0,
  },
] as const

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

for (const def of FIXTURES) {
  const outPath = path.resolve(ROOT, def.file)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const trace = synthesiseTrace(def)
  const buf = buildAbifBuffer(trace)
  fs.writeFileSync(outPath, Buffer.from(buf))
  const kb = (buf.byteLength / 1024).toFixed(1)
  console.log(`wrote ${def.file}  (${def.numBases} bases, ${kb} KB)`)
}
