import { describe, expect, it } from 'vitest'
import { COMMON_RESTRICTION_ENZYMES } from '../../src/annotations'
import { splitCircularRange, toCircularAngles, toLinearRatio } from '../../src/plasmidMap/layout'
import { findRestrictionSites } from '../../src/plasmidMap/restriction'

describe('plasmid map restriction and layout model', () => {
  it('returns exact 1-based restriction positions and enzyme names for a known sequence', () => {
    const enzymes = COMMON_RESTRICTION_ENZYMES.filter((enzyme) => (
      enzyme.name === 'EcoRI' || enzyme.name === 'BamHI' || enzyme.name === 'HindIII'
    ))
    const sequence = 'AAGAATTCGGATCCAAGCTT'
    const sites = findRestrictionSites(sequence, enzymes)

    expect(sites.map((site) => ({ enzyme: site.enzymeName, position: site.position }))).toEqual([
      { enzyme: 'EcoRI', position: 3 },
      { enzyme: 'BamHI', position: 9 },
      { enzyme: 'HindIII', position: 15 },
    ])
  })

  it('detects circular-origin restriction sites that wrap across the sequence boundary', () => {
    const ecoRI = COMMON_RESTRICTION_ENZYMES.filter((enzyme) => enzyme.name === 'EcoRI')
    const circularSequence = 'AATTCG'
    const sites = findRestrictionSites(circularSequence, ecoRI, { circular: true })

    expect(sites).toHaveLength(1)
    expect(sites[0]).toMatchObject({
      enzymeName: 'EcoRI',
      position: 6,
      startIndex: 5,
      endIndex: 5,
      endPosition: 5,
    })
  })

  it('splits and projects origin-wrapping ranges exactly for circular rendering', () => {
    const split = splitCircularRange({ start: 10, end: 2 }, 12)
    expect(split).toEqual([
      { start: 10, end: 12 },
      { start: 0, end: 2 },
    ])

    const angles = toCircularAngles({ start: 10, end: 2 }, 12)
    expect(angles).toEqual({
      wrapsOrigin: true,
      startAngle: 210,
      endAngle: 330,
      sweepAngle: 120,
    })
    expect(toLinearRatio(3, 12)).toBeCloseTo(0.25, 10)
  })
})
