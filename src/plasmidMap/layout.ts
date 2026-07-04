import type { BaseRange } from '../annotations'

export type MapTopology = 'linear' | 'circular'

export interface NormalizedRange extends BaseRange {
  wrapsOrigin: boolean
  span: number
}

function clampIndex(index: number, sequenceLength: number): number {
  return Math.max(0, Math.min(sequenceLength, Math.trunc(index)))
}

export function normalizeRange(range: BaseRange, sequenceLength: number, topology: MapTopology): NormalizedRange {
  if (sequenceLength <= 0) return { start: 0, end: 0, wrapsOrigin: false, span: 0 }
  const start = clampIndex(range.start, sequenceLength)
  const end = clampIndex(range.end, sequenceLength)

  if (topology === 'linear') {
    const normalizedEnd = Math.max(start, end)
    return {
      start,
      end: normalizedEnd,
      wrapsOrigin: false,
      span: normalizedEnd - start,
    }
  }

  if (start === sequenceLength && end === sequenceLength) {
    return { start: 0, end: 0, wrapsOrigin: false, span: 0 }
  }
  const circularStart = start === sequenceLength ? 0 : start
  const circularEnd = end === sequenceLength ? 0 : end
  const wrapsOrigin = circularEnd < circularStart
  const span = wrapsOrigin
    ? sequenceLength - circularStart + circularEnd
    : circularEnd - circularStart
  return { start: circularStart, end: circularEnd, wrapsOrigin, span: Math.max(0, span) }
}

export function toLinearRatios(range: BaseRange, sequenceLength: number): { start: number; end: number; mid: number } {
  const normalized = normalizeRange(range, sequenceLength, 'linear')
  if (sequenceLength <= 0) return { start: 0, end: 0, mid: 0 }
  const start = normalized.start / sequenceLength
  const end = normalized.end / sequenceLength
  return { start, end, mid: (start + end) / 2 }
}

export function toCircularAngles(
  range: BaseRange,
  sequenceLength: number,
): { startAngle: number; endAngle: number; sweepAngle: number; midAngle: number; wrapsOrigin: boolean } {
  const normalized = normalizeRange(range, sequenceLength, 'circular')
  if (sequenceLength <= 0) {
    return { startAngle: -90, endAngle: -90, sweepAngle: 0, midAngle: -90, wrapsOrigin: false }
  }
  const startAngle = (normalized.start / sequenceLength) * 360 - 90
  const sweepAngle = (normalized.span / sequenceLength) * 360
  return {
    startAngle,
    endAngle: startAngle + sweepAngle,
    sweepAngle,
    midAngle: startAngle + sweepAngle / 2,
    wrapsOrigin: normalized.wrapsOrigin,
  }
}

export function splitCircularRange(range: BaseRange, sequenceLength: number): BaseRange[] {
  const normalized = normalizeRange(range, sequenceLength, 'circular')
  if (normalized.span <= 0) return []
  if (!normalized.wrapsOrigin) return [{ start: normalized.start, end: normalized.end }]
  return [
    { start: normalized.start, end: sequenceLength },
    { start: 0, end: normalized.end },
  ]
}
