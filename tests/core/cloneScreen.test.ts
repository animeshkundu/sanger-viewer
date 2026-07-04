/**
 * cloneScreen.test.ts — Exact-value unit tests for stackedViewer.ts.
 *
 * Tests cover:
 *   - computeStackedView: EXACT mismatch column indices, per-column bases, allAgree, consensusBase
 *   - nextMismatch / prevMismatch: cursor navigation
 *   - clampCursor: boundary behaviour
 *   - buildMismatchReport: EXACT TSV output
 */

import { describe, expect, it } from 'vitest'
import {
  computeStackedView,
  nextMismatch,
  prevMismatch,
  clampCursor,
  buildMismatchReport,
} from '../../src/cloneScreen/stackedViewer'

// ── computeStackedView — edge cases ───────────────────────────────────────────

describe('computeStackedView — edge cases', () => {
  it('returns empty result for an empty input array', () => {
    const r = computeStackedView([])
    expect(r.columns).toEqual([])
    expect(r.mismatchIndices).toEqual([])
    expect(r.traceCount).toBe(0)
    expect(r.length).toBe(0)
  })

  it('returns empty result for a single sequence (< 2 traces)', () => {
    const r = computeStackedView(['ACGT'])
    expect(r.columns).toEqual([])
    expect(r.mismatchIndices).toEqual([])
    expect(r.traceCount).toBe(1)
    expect(r.length).toBe(0)
  })

  it('clamps length to the shortest sequence', () => {
    const r = computeStackedView(['ACGTACGT', 'ACG'])
    expect(r.length).toBe(3)
    expect(r.columns).toHaveLength(3)
  })
})

// ── computeStackedView — two identical sequences ──────────────────────────────

describe('computeStackedView — two identical sequences', () => {
  const r = computeStackedView(['ACGT', 'ACGT'])

  it('has length 4', () => expect(r.length).toBe(4))
  it('has traceCount 2', () => expect(r.traceCount).toBe(2))
  it('has zero mismatch indices', () => expect(r.mismatchIndices).toEqual([]))
  it('all columns agree', () => {
    for (const col of r.columns) {
      expect(col.allAgree).toBe(true)
    }
  })
  it('EXACT: each column has two identical bases', () => {
    expect(r.columns[0].bases).toEqual(['A', 'A'])
    expect(r.columns[1].bases).toEqual(['C', 'C'])
    expect(r.columns[2].bases).toEqual(['G', 'G'])
    expect(r.columns[3].bases).toEqual(['T', 'T'])
  })
  it('EXACT: consensus base equals the agreed base', () => {
    expect(r.columns[0].consensusBase).toBe('A')
    expect(r.columns[1].consensusBase).toBe('C')
    expect(r.columns[2].consensusBase).toBe('G')
    expect(r.columns[3].consensusBase).toBe('T')
  })
})

// ── computeStackedView — two-sequence mismatch ────────────────────────────────

describe('computeStackedView — two sequences with mismatches', () => {
  // seqA: ACGT — pos 1 = C, pos 3 = T
  // seqB: ATGA — pos 1 = T, pos 3 = A
  // Mismatches at 0-based positions 1 and 3
  const r = computeStackedView(['ACGT', 'ATGA'])

  it('EXACT: mismatchIndices = [1, 3]', () => {
    expect(r.mismatchIndices).toEqual([1, 3])
  })

  it('EXACT: position 0 agrees (A/A)', () => {
    expect(r.columns[0].allAgree).toBe(true)
    expect(r.columns[0].bases).toEqual(['A', 'A'])
    expect(r.columns[0].consensusBase).toBe('A')
  })

  it('EXACT: position 1 is a mismatch (C vs T → IUPAC Y)', () => {
    expect(r.columns[1].allAgree).toBe(false)
    expect(r.columns[1].bases).toEqual(['C', 'T'])
    expect(r.columns[1].consensusBase).toBe('Y')
  })

  it('EXACT: position 2 agrees (G/G)', () => {
    expect(r.columns[2].allAgree).toBe(true)
    expect(r.columns[2].bases).toEqual(['G', 'G'])
    expect(r.columns[2].consensusBase).toBe('G')
  })

  it('EXACT: position 3 is a mismatch (T vs A → IUPAC W)', () => {
    expect(r.columns[3].allAgree).toBe(false)
    expect(r.columns[3].bases).toEqual(['T', 'A'])
    expect(r.columns[3].consensusBase).toBe('W')
  })

  it('EXACT: mismatchCount = 2', () => {
    expect(r.mismatchIndices.length).toBe(2)
  })
})

// ── computeStackedView — three sequences ──────────────────────────────────────

describe('computeStackedView — three sequences', () => {
  /**
   * seqA: ACGTACGT
   * seqB: ATGTACGA
   * seqC: ACGTACGT
   *
   * Column-by-column:
   *   0: A,A,A → agree
   *   1: C,T,C → mismatch (C=2, T=1 → C wins; still mismatch)
   *   2: G,G,G → agree
   *   3: T,T,T → agree
   *   4: A,A,A → agree
   *   5: C,C,C → agree
   *   6: G,G,G → agree
   *   7: T,A,T → mismatch (T=2, A=1 → T wins)
   *
   * EXACT mismatch indices: [1, 7]
   */
  const r = computeStackedView(['ACGTACGT', 'ATGTACGA', 'ACGTACGT'])

  it('EXACT: mismatchIndices = [1, 7]', () => {
    expect(r.mismatchIndices).toEqual([1, 7])
  })

  it('has length 8', () => expect(r.length).toBe(8))
  it('has traceCount 3', () => expect(r.traceCount).toBe(3))

  it('EXACT: position 1 bases are [C, T, C]', () => {
    expect(r.columns[1].bases).toEqual(['C', 'T', 'C'])
    expect(r.columns[1].allAgree).toBe(false)
    expect(r.columns[1].consensusBase).toBe('C')  // C is the plurality winner (2 vs 1)
  })

  it('EXACT: position 7 bases are [T, A, T]', () => {
    expect(r.columns[7].bases).toEqual(['T', 'A', 'T'])
    expect(r.columns[7].allAgree).toBe(false)
    expect(r.columns[7].consensusBase).toBe('T')  // T wins (2 vs 1)
  })

  it('EXACT: position 0 agrees (all A)', () => {
    expect(r.columns[0].allAgree).toBe(true)
    expect(r.columns[0].consensusBase).toBe('A')
  })

  it('EXACT: synchronized cursor — all traces show correct base at position 3', () => {
    // cursorPos = 3 → all traces have 'T' → cursor position [3] gives bases ['T','T','T']
    expect(r.columns[3].bases).toEqual(['T', 'T', 'T'])
    expect(r.columns[3].allAgree).toBe(true)
  })

  it('EXACT: synchronized cursor — all traces show correct base at position 1 (mismatch)', () => {
    // cursorPos = 1 → bases['C','T','C']; trace 0 and 2 = C, trace 1 = T
    const col = r.columns[1]
    expect(col.bases[0]).toBe('C')
    expect(col.bases[1]).toBe('T')
    expect(col.bases[2]).toBe('C')
  })
})

// ── computeStackedView — case normalization ────────────────────────────────────

describe('computeStackedView — case normalization', () => {
  it('normalises lowercase bases to uppercase', () => {
    const r = computeStackedView(['acgt', 'ACGT'])
    expect(r.mismatchIndices).toEqual([])
    expect(r.columns[0].bases).toEqual(['A', 'A'])
  })

  it('mixed case does not produce spurious mismatches', () => {
    const r = computeStackedView(['acgt', 'acgt'])
    expect(r.mismatchIndices).toEqual([])
  })
})

// ── nextMismatch ───────────────────────────────────────────────────────────────

describe('nextMismatch', () => {
  const indices = [1, 3, 7]

  it('EXACT: cursor at 0 → next mismatch is 1', () => {
    expect(nextMismatch(indices, 0)).toBe(1)
  })

  it('EXACT: cursor at 1 → next mismatch is 3', () => {
    expect(nextMismatch(indices, 1)).toBe(3)
  })

  it('EXACT: cursor at 3 → next mismatch is 7', () => {
    expect(nextMismatch(indices, 3)).toBe(7)
  })

  it('EXACT: cursor at 7 → no next mismatch (returns null)', () => {
    expect(nextMismatch(indices, 7)).toBeNull()
  })

  it('EXACT: cursor at 6 → next mismatch is 7', () => {
    expect(nextMismatch(indices, 6)).toBe(7)
  })

  it('returns null for empty mismatch list', () => {
    expect(nextMismatch([], 0)).toBeNull()
  })
})

// ── prevMismatch ───────────────────────────────────────────────────────────────

describe('prevMismatch', () => {
  const indices = [1, 3, 7]

  it('EXACT: cursor at 7 → prev mismatch is 3', () => {
    expect(prevMismatch(indices, 7)).toBe(3)
  })

  it('EXACT: cursor at 3 → prev mismatch is 1', () => {
    expect(prevMismatch(indices, 3)).toBe(1)
  })

  it('EXACT: cursor at 1 → no prev mismatch (returns null)', () => {
    expect(prevMismatch(indices, 1)).toBeNull()
  })

  it('EXACT: cursor at 0 → no prev mismatch (returns null)', () => {
    expect(prevMismatch(indices, 0)).toBeNull()
  })

  it('EXACT: cursor at 8 → prev mismatch is 7', () => {
    expect(prevMismatch(indices, 8)).toBe(7)
  })

  it('returns null for empty mismatch list', () => {
    expect(prevMismatch([], 5)).toBeNull()
  })
})

// ── clampCursor ────────────────────────────────────────────────────────────────

describe('clampCursor', () => {
  it('EXACT: clamps negative to 0', () => {
    expect(clampCursor(-5, 10)).toBe(0)
  })

  it('EXACT: clamps beyond length - 1', () => {
    expect(clampCursor(100, 10)).toBe(9)
  })

  it('EXACT: passes through valid mid-range value', () => {
    expect(clampCursor(5, 10)).toBe(5)
  })

  it('EXACT: returns 0 for empty sequence (length 0)', () => {
    expect(clampCursor(5, 0)).toBe(0)
  })

  it('EXACT: clamps to 0 for length 1', () => {
    expect(clampCursor(1, 1)).toBe(0)
  })
})

// ── buildMismatchReport ────────────────────────────────────────────────────────

describe('buildMismatchReport', () => {
  it('returns empty string for zero mismatches', () => {
    const r = computeStackedView(['ACGT', 'ACGT'])
    expect(buildMismatchReport(r, ['a.ab1', 'b.ab1'])).toBe('')
  })

  it('EXACT: TSV report for known 2-trace mismatch pair', () => {
    // seqA=ACGT, seqB=ATGA → mismatches at 0-based [1,3] → 1-based [2,4]
    const r = computeStackedView(['ACGT', 'ATGA'])
    const report = buildMismatchReport(r, ['trace_A.ab1', 'trace_B.scf'])
    const lines = report.trimEnd().split('\n')
    expect(lines[0]).toBe('Position\ttrace_A.ab1\ttrace_B.scf')
    expect(lines[1]).toBe('2\tC\tT')
    expect(lines[2]).toBe('4\tT\tA')
    expect(lines).toHaveLength(3)
    expect(report.endsWith('\n')).toBe(true)
  })

  it('EXACT: 3-trace TSV report header includes all file names', () => {
    const r = computeStackedView(['ACGTACGT', 'ATGTACGA', 'ACGTACGT'])
    const report = buildMismatchReport(r, ['a.ab1', 'b.ab1', 'c.ab1'])
    const lines = report.trimEnd().split('\n')
    expect(lines[0]).toBe('Position\ta.ab1\tb.ab1\tc.ab1')
    // Line 1: mismatch at pos 1 (0-based) → position 2 (1-based), bases C,T,C
    expect(lines[1]).toBe('2\tC\tT\tC')
    // Line 2: mismatch at pos 7 (0-based) → position 8 (1-based), bases T,A,T
    expect(lines[2]).toBe('8\tT\tA\tT')
  })
})
