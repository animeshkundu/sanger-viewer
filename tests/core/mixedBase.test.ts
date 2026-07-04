import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TraceData } from '../../src/types/trace'
import { callMixedBases } from '../../src/calling/mixedBase'
import { BaseEditModel } from '../../src/editing/BaseEditModel'
import { parseTrace } from '../../src/parsers'

function makeSyntheticTrace(): TraceData {
  const sampleCount = 10
  const A = new Float32Array(sampleCount)
  const C = new Float32Array(sampleCount)
  const G = new Float32Array(sampleCount)
  const T = new Float32Array(sampleCount)

  // i=0 A/G => R (60/100)
  A[1] = 100; G[1] = 60
  // i=1 C/T => Y (45/90)
  C[2] = 90; T[2] = 45
  // i=2 G/C => S (72/120)
  G[3] = 120; C[3] = 72
  // i=3 T/A => W (55/110)
  T[4] = 110; A[4] = 55
  // i=4 A/C => M (40/80)
  A[5] = 80; C[5] = 40
  // i=5 T/G => K (49/100)
  T[6] = 100; G[6] = 49
  // i=6 primary only (ratio 0.3)
  C[7] = 100; A[7] = 30

  return {
    format: 'ab1',
    fileName: 'synthetic.ab1',
    sampleCount,
    channels: { A, C, G, T },
    baseCalls: ['A', 'C', 'G', 'T', 'A', 'T', 'C', 'G'],
    peakPositions: [1, 2, 3, 4, 5, 6, 7, -1],
    qualities: null,
    sequence: 'ACGTATCG',
    metadata: {},
  }
}

describe('callMixedBases', () => {
  it('calls exact 2-base IUPAC ambiguities at known indices on synthetic peaks', () => {
    const trace = makeSyntheticTrace()
    const result = callMixedBases(trace, 0.4)

    expect(result.baseCalls).toEqual(['R', 'Y', 'S', 'W', 'M', 'K', 'C', 'G'])
    expect(result.ambiguousIndices).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.ambiguousCount).toBe(6)
    expect(result.sequence).toBe('RYSWMKCG')
  })

  it('uses threshold monotonically and preserves degenerate/invalid calls', () => {
    const trace = makeSyntheticTrace()
    const strict = callMixedBases(trace, 0.7)
    const permissive = callMixedBases(trace, 0.3)

    expect(strict.ambiguousCount).toBeLessThan(permissive.ambiguousCount)
    expect(strict.baseCalls[7]).toBe('G')
    expect(strict.baseCalls[6]).toBe('C')
  })

  it('produces exact known ambiguity calls on real 3100.ab1 fixture', async () => {
    const fixture = await fs.readFile(path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1'))
    const ab = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
    const trace = parseTrace(ab, '3100.ab1')
    const result = callMixedBases(trace, 0.35)

    expect(result.ambiguousCount).toBe(result.ambiguousIndices.length)
    expect(result.ambiguousIndices.slice(0, 6)).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.baseCalls.slice(0, 6)).toEqual(['S', 'S', 'S', 'K', 'K', 'W'])
  })
})

// ---------------------------------------------------------------------------
// Edit-model integration: explicit edits must survive callMixedBases re-pin
// ---------------------------------------------------------------------------
// This mirrors the logic in buildDisplayTrace(): apply edits → callMixedBases
// (which overwrites edited positions with IUPAC codes) → re-pin edited positions
// back on top.  An explicit user edit MUST win over a signal-derived IUPAC code.

describe('callMixedBases + BaseEditModel — edit persistence', () => {
  it('explicit user edit at an ambiguous position wins over the IUPAC code', () => {
    // The synthetic trace has position 4 (peak at sample 5, A=80 C=40).
    // At threshold 0.4, ratio = 40/80 = 0.50 → callMixedBases assigns 'M'.
    const trace = makeSyntheticTrace()

    // Confirm the baseline: without any edit, position 4 is called 'M'.
    const baseline = callMixedBases(trace, 0.4)
    expect(baseline.baseCalls[4]).toBe('M')
    expect(baseline.ambiguousIndices).toContain(4)

    // User edits position 4 (forward-strand) to 'G'.
    const editModel = new BaseEditModel()
    editModel.apply(4, 'G', trace.baseCalls[4])

    // Step 1 (as buildDisplayTrace does): apply edits before callMixedBases.
    // Only baseCalls and sequence are updated here; channels/peakPositions are unchanged
    // because callMixedBases derives its IUPAC calls from raw signal, not baseCalls.
    const editedBaseCalls = editModel.applyToBaseCalls(trace.baseCalls)
    const editedTrace: TraceData = { ...trace, baseCalls: editedBaseCalls, sequence: editedBaseCalls.join('') }

    // Step 2: callMixedBases runs on the edited trace.
    // It reads channel amplitudes — not baseCalls — so it still finds A≈C at
    // position 4's peak and overwrites the edited 'G' with 'M'.
    const mixedResult = callMixedBases(editedTrace, 0.4)
    expect(mixedResult.baseCalls[4]).toBe('M')  // overwritten by mixed-base caller

    // Step 3 (re-pin): restore the user's explicit edit on top of the IUPAC call.
    const pinnedBaseCalls = mixedResult.baseCalls.slice()
    const editedDisplayIndices = new Set(editModel.editedIndices)
    for (const idx of editedDisplayIndices) {
      pinnedBaseCalls[idx] = editedBaseCalls[idx]
    }
    const nonEditedAmbiguous = mixedResult.ambiguousIndices.filter(i => !editedDisplayIndices.has(i))

    // After re-pin, the user's 'G' must be present — not 'M'.
    expect(pinnedBaseCalls[4]).toBe('G')
    // The re-pinned position is removed from the ambiguous set.
    expect(nonEditedAmbiguous).not.toContain(4)
    // Other genuinely ambiguous positions (0–3 and 5) are unaffected.
    expect(pinnedBaseCalls[0]).toBe('R')
    expect(pinnedBaseCalls[5]).toBe('K')
  })
})
