import { describe, expect, it } from 'vitest'
import { buildAnnotationFeatures, detectOrfFeatures, scanRestrictionSiteFeatures } from '../../src/annotations'
import { COMMON_RESTRICTION_ENZYMES } from '../../src/annotations/restrictionSites'

describe('annotation ORF detection', () => {
  it('detects exact six-frame ORF ranges (including reverse strand)', () => {
    const sequence = 'ATGAAATAANNNTTAGGGCAT'
    const features = detectOrfFeatures(sequence).map((feature) => ({
      start: feature.start,
      end: feature.end,
      strand: feature.strand,
      frame: feature.frame,
      row: feature.row,
    }))

    expect(features).toEqual([
      { start: 0, end: 9, strand: '+', frame: 1, row: 'orf+1' },
      { start: 12, end: 21, strand: '-', frame: 1, row: 'orf-1' },
    ])
  })
})

describe('annotation restriction-site detection', () => {
  it('finds exact enzyme positions and cut offsets on both strands', () => {
    const sequence = 'TTTGAATTCGGGTCTCCCGAGACCTTT'
    const enzymes = COMMON_RESTRICTION_ENZYMES.filter((enzyme) => enzyme.name === 'EcoRI' || enzyme.name === 'BsaI')
    const sites = scanRestrictionSiteFeatures(sequence, enzymes).map((site) => ({
      enzyme: site.enzyme,
      strand: site.strand,
      start: site.start,
      end: site.end,
      cuts: site.cutPositions,
    }))

    expect(sites).toEqual([
      { enzyme: 'EcoRI', strand: '+', start: 3, end: 9, cuts: [4, 8] },
      { enzyme: 'BsaI', strand: '+', start: 10, end: 16, cuts: [11, 15] },
      { enzyme: 'BsaI', strand: '-', start: 18, end: 24, cuts: [19, 23] },
    ])
  })
})

describe('annotation feature assembly', () => {
  it('combines ORF and restriction annotations with stable ordering', () => {
    const sequence = 'ATGAAATAAGAATTCNNNTTAGGGCAT'
    const features = buildAnnotationFeatures(sequence)

    expect(features[0]).toMatchObject({
      type: 'orf',
      start: 0,
      end: 9,
      strand: '+',
    })
    expect(features.some((feature) => feature.type === 'restriction' && feature.name === 'EcoRI')).toBe(true)
    expect(features.some((feature) => feature.type === 'orf' && feature.strand === '-')).toBe(true)
  })
})
