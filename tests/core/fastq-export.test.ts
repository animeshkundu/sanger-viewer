import { describe, expect, it } from 'vitest'
import { toFastq, toQual } from '../../src/export/fastq'
import type { TraceData } from '../../src/types/trace'
import type { TrimResult } from '../../src/quality/mottTrim'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrace(overrides: Partial<TraceData> = {}): TraceData {
  return {
    format: 'ab1',
    fileName: 'test.ab1',
    sampleCount: 4,
    channels: {
      A: new Float32Array([1, 0, 0, 0]),
      C: new Float32Array([0, 1, 0, 0]),
      G: new Float32Array([0, 0, 1, 0]),
      T: new Float32Array([0, 0, 0, 1]),
    },
    baseCalls: ['A', 'C', 'G', 'T'],
    peakPositions: [0, 1, 2, 3],
    qualities: [30, 35, 40, 20],
    sequence: 'ACGT',
    metadata: {},
    ...overrides,
  }
}

// Phred+33 encoding: score 30 → chr(63)='?', 35→chr(68)='D', 40→chr(73)='I', 20→chr(53)='5'
// So ACGT with [30,35,40,20] → '?DI5'

// ---------------------------------------------------------------------------
// toFastq — exact byte assertions
// ---------------------------------------------------------------------------

describe('toFastq', () => {
  it('produces correct FASTQ record for a known 4-base trace', () => {
    const trace = makeTrace()
    const fastq = toFastq(trace)
    // Four exact lines: @header, sequence, +, quality
    const lines = fastq.split('\n')
    expect(lines[0]).toBe('@test')
    expect(lines[1]).toBe('ACGT')
    expect(lines[2]).toBe('+')
    expect(lines[3]).toBe('?DI5')
    // File ends with a newline
    expect(fastq).toMatch(/\n$/)
  })

  it('encodes Phred+33 correctly: score 0 → "!" sentinel', () => {
    const trace = makeTrace({ qualities: [0, 0, 0, 0] })
    const fastq = toFastq(trace)
    const lines = fastq.split('\n')
    expect(lines[3]).toBe('!!!!')
  })

  it('encodes Phred+33 correctly: score 93 → "~" (maximum printable)', () => {
    const trace = makeTrace({ qualities: [93, 93, 93, 93] })
    const fastq = toFastq(trace)
    const lines = fastq.split('\n')
    expect(lines[3]).toBe('~~~~')
  })

  it('clamps scores above 93 to "~"', () => {
    const trace = makeTrace({ qualities: [100, 100, 100, 100] })
    const fastq = toFastq(trace)
    expect(fastq.split('\n')[3]).toBe('~~~~')
  })

  it('uses "!" sentinel for every base when qualities is null', () => {
    const trace = makeTrace({ qualities: null })
    const fastq = toFastq(trace)
    const lines = fastq.split('\n')
    expect(lines[3]).toBe('!!!!')
  })

  it('appends _revcomp to the FASTQ ID and adds header tag when isRevcomp=true', () => {
    const trace = makeTrace()
    const fastq = toFastq(trace, true)
    expect(fastq.split('\n')[0]).toBe('@test_revcomp [reverse complement]')
  })

  it('produces the correct full FASTQ record with all 4 lines', () => {
    const trace = makeTrace({ fileName: 'my sample.ab1', qualities: [20, 30, 40, 10] })
    // Phred+33: 20→'5', 30→'?', 40→'I', 10→'+'
    const fastq = toFastq(trace)
    expect(fastq).toBe('@my_sample\nACGT\n+\n5?I+\n')
  })

  it('uses trimmed sequence and qualities in trimmed mode', () => {
    const trace = makeTrace({
      baseCalls: ['A', 'C', 'G', 'T', 'A'],
      qualities: [10, 30, 35, 40, 10],
      sequence: 'ACGTA',
      sampleCount: 5,
      channels: {
        A: new Float32Array(5),
        C: new Float32Array(5),
        G: new Float32Array(5),
        T: new Float32Array(5),
      },
    })
    const trim: TrimResult = {
      status: 'ok',
      trimStart: 1,
      trimEnd: 4,
      trimmedSequence: 'CGT',
      trimmedLength: 3,
      meanQuality: 35,
    }
    const fastq = toFastq(trace, false, trim, 'trimmed')
    const lines = fastq.split('\n')
    // Sequence is the trimmed slice: 'CGT'
    expect(lines[1]).toBe('CGT')
    // Qualities: [30,35,40] Phred+33 → '?DI'
    expect(lines[3]).toBe('?DI')
    // Header has trimming annotation
    expect(lines[0]).toContain('trimmed')
  })

  it('emits empty sequence and quality lines for all-trimmed status', () => {
    const trace = makeTrace()
    const trim: TrimResult = {
      status: 'all-trimmed',
      trimStart: 0,
      trimEnd: 0,
      trimmedSequence: '',
      trimmedLength: 0,
      meanQuality: 0,
    }
    const fastq = toFastq(trace, false, trim, 'trimmed')
    expect(fastq).toBe('@test [trimmed all/4 bp]\n\n+\n\n')
  })
})

// ---------------------------------------------------------------------------
// toQual — exact value assertions
// ---------------------------------------------------------------------------

describe('toQual', () => {
  it('produces correct .qual output for a known trace', () => {
    const trace = makeTrace()
    const qual = toQual(trace)
    const lines = qual.split('\n')
    expect(lines[0]).toBe('>test')
    expect(lines[1]).toBe('30 35 40 20')
    expect(qual).toMatch(/\n$/)
  })

  it('appends _revcomp to the .qual ID when isRevcomp=true', () => {
    const trace = makeTrace()
    const qual = toQual(trace, true)
    expect(qual.split('\n')[0]).toBe('>test_revcomp [reverse complement]')
  })

  it('uses zeros when qualities is null', () => {
    const trace = makeTrace({ qualities: null })
    const qual = toQual(trace)
    const lines = qual.split('\n')
    expect(lines[0]).toBe('>test')
    expect(lines[1]).toBe('0 0 0 0')
  })

  it('wraps to 60 values per line for long reads', () => {
    const longQualities = Array.from({ length: 65 }, (_, i) => i % 40)
    const trace = makeTrace({
      baseCalls: Array.from({ length: 65 }, () => 'A'),
      qualities: longQualities,
      sequence: 'A'.repeat(65),
      sampleCount: 65,
      channels: {
        A: new Float32Array(65),
        C: new Float32Array(65),
        G: new Float32Array(65),
        T: new Float32Array(65),
      },
    })
    const qual = toQual(trace)
    const lines = qual.split('\n').filter((l) => l.trim().length > 0 && !l.startsWith('>'))
    // First line: 60 values, second: 5 values
    expect(lines[0].split(' ').length).toBe(60)
    expect(lines[1].split(' ').length).toBe(5)
  })

  it('emits header only (no quality values) for all-trimmed status', () => {
    const trace = makeTrace()
    const trim: TrimResult = {
      status: 'all-trimmed',
      trimStart: 0,
      trimEnd: 0,
      trimmedSequence: '',
      trimmedLength: 0,
      meanQuality: 0,
    }
    const qual = toQual(trace, false, trim, 'trimmed')
    expect(qual).toBe('>test [trimmed all/4 bp]\n')
  })
})
