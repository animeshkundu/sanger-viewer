import { describe, expect, it } from 'vitest'
import {
  computeQualityHeatmapCells,
  computeQualityHeatmapRuns,
  findQualityHeatmapCell,
} from '../../src/quality/qualityHeatmap'

describe('computeQualityHeatmapCells', () => {
  it('maps base intervals to continuous viewport-aligned color cells', () => {
    const cells = computeQualityHeatmapCells(
      [0, 20, 30, 40],
      [10, 20, 30, 40],
      0,
      2,
      30,
    )

    expect(cells).toEqual([
      { baseIndex: 0, score: 0, x: 2.5, width: 5, tier: 'poor', cssVar: '--color-qual-poor' },
      { baseIndex: 1, score: 20, x: 7.5, width: 5, tier: 'fair', cssVar: '--color-qual-fair' },
      { baseIndex: 2, score: 30, x: 12.5, width: 5, tier: 'good', cssVar: '--color-qual-good' },
      { baseIndex: 3, score: 40, x: 17.5, width: 5, tier: 'excellent', cssVar: '--color-qual-excellent' },
    ])
    expect(cells.slice(1).every((cell, index) => cell.x === cells[index].x + cells[index].width)).toBe(true)
  })

  it('clips heatmap cells to the viewport and trim window', () => {
    const cells = computeQualityHeatmapCells(
      [10, 20, 30, 40, 35],
      [5, 10, 15, 20, 25],
      8,
      1,
      10,
      1,
      4,
    )

    expect(cells).toEqual([
      { baseIndex: 1, score: 20, x: 0, width: 4.5, tier: 'fair', cssVar: '--color-qual-fair' },
      { baseIndex: 2, score: 30, x: 4.5, width: 5, tier: 'good', cssVar: '--color-qual-good' },
      { baseIndex: 3, score: 40, x: 9.5, width: 0.5, tier: 'excellent', cssVar: '--color-qual-excellent' },
    ])
  })

  it('returns no cells when quality scores are unavailable', () => {
    expect(computeQualityHeatmapCells(null, [10, 20], 0, 1, 100)).toEqual([])
    expect(computeQualityHeatmapCells([], [10, 20], 0, 1, 100)).toEqual([])
  })
})

describe('computeQualityHeatmapRuns', () => {
  it('rasterizes opaque device-pixel runs with low-confidence cells on top', () => {
    const cells = computeQualityHeatmapCells(
      [40, 10, 40],
      [10, 10.4, 10.8],
      10,
      1,
      2,
    )

    expect(computeQualityHeatmapRuns(cells, 2, 1)).toEqual([
      { x: 0, width: 1, tier: 'poor', cssVar: '--color-qual-poor' },
    ])
  })
})

describe('findQualityHeatmapCell', () => {
  const cells = computeQualityHeatmapCells([10, 20, 30], [10, 20, 30], 0, 1, 40)

  it('returns the exact base at cell centers and shared boundaries', () => {
    expect(findQualityHeatmapCell(cells, 10)?.baseIndex).toBe(0)
    expect(findQualityHeatmapCell(cells, 15)?.baseIndex).toBe(1)
    expect(findQualityHeatmapCell(cells, 30)?.baseIndex).toBe(2)
  })

  it('returns null outside painted cells or for invalid coordinates', () => {
    expect(findQualityHeatmapCell(cells, 4.9)).toBeNull()
    expect(findQualityHeatmapCell(cells, 35)).toBeNull()
    expect(findQualityHeatmapCell(cells, Number.NaN)).toBeNull()
  })
})
