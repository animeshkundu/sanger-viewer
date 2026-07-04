import { readFileSync } from 'fs'
import path from 'path'
import { test, expect } from 'vitest'
import { parseTrace } from '../../src/parsers/index.ts'
import { callMixedBases, DEFAULT_MIXED_BASE_THRESHOLD } from '../../src/calling/mixedBase.ts'
import { getBaseInspectorInfo } from '../../src/components/BaseInspector.ts'

test('print fixture values', () => {
  const buf = readFileSync(path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const trace = parseTrace(ab, '310.ab1')
  const mixed = callMixedBases(trace, DEFAULT_MIXED_BASE_THRESHOLD)
  const displayTrace = { ...trace, baseCalls: mixed.baseCalls, sequence: mixed.sequence }
  const info = getBaseInspectorInfo(displayTrace, 0)
  console.log('INDEX 0 INFO:', JSON.stringify(info))
  console.log('First 5 bases:', displayTrace.baseCalls.slice(0, 5))
  console.log('First 5 qualities:', displayTrace.qualities?.slice(0, 5))
  expect(info).not.toBeNull()
})
