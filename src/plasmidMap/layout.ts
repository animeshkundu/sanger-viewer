export interface CircularRange {
  start: number
  end: number
}

export interface CircularAngles {
  wrapsOrigin: boolean
  startAngle: number
  endAngle: number
  sweepAngle: number
}

function normalizePosition(position: number, sequenceLength: number): number {
  if (sequenceLength <= 0) return 0
  const mod = position % sequenceLength
  return mod < 0 ? mod + sequenceLength : mod
}

function toAngle(position: number, sequenceLength: number): number {
  const normalized = normalizePosition(position, sequenceLength)
  return ((normalized / sequenceLength) * 360 - 90 + 360) % 360
}

export function splitCircularRange(range: CircularRange, sequenceLength: number): CircularRange[] {
  if (sequenceLength <= 0) return []

  const start = normalizePosition(range.start, sequenceLength)
  const end = normalizePosition(range.end, sequenceLength)

  if (start === end) {
    return [{ start: 0, end: sequenceLength }]
  }

  if (end > start) {
    return [{ start, end }]
  }

  return [
    { start, end: sequenceLength },
    { start: 0, end },
  ]
}

export function toLinearRatio(position: number, sequenceLength: number): number {
  if (sequenceLength <= 0) return 0
  return normalizePosition(position, sequenceLength) / sequenceLength
}

export function toCircularAngles(range: CircularRange, sequenceLength: number): CircularAngles {
  if (sequenceLength <= 0) {
    return {
      wrapsOrigin: false,
      startAngle: 0,
      endAngle: 0,
      sweepAngle: 0,
    }
  }

  const start = normalizePosition(range.start, sequenceLength)
  const end = normalizePosition(range.end, sequenceLength)
  if (start === end) {
    return {
      wrapsOrigin: false,
      startAngle: 0,
      endAngle: 360,
      sweepAngle: 360,
    }
  }

  const wrapsOrigin = end < start
  const span = wrapsOrigin
    ? sequenceLength - start + end
    : end - start

  return {
    wrapsOrigin,
    startAngle: toAngle(start, sequenceLength),
    endAngle: toAngle(end, sequenceLength),
    sweepAngle: (span / sequenceLength) * 360,
  }
}
