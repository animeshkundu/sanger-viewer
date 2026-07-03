import { describe, expect, it } from 'vitest'
import { buildAnnotationFeatures, detectOrfFeatures, filterAnnotationFeaturesByRange, scanRestrictionSites } from '../../src/annotations'
import { COMMON_RESTRICTION_ENZYMES } from '../../src/annotations/restrictionSites'

describe('annotation engine', () => {
  it('detects exact ORF ranges across forward and reverse frames', () => {
    const sequence = 'CCCATGAAATAACCCTTAGGGCATCCC'
    const orfs = detectOrfFeatures(sequence)

    const forward = orfs.find((feature) => feature.frame === 1 && feature.strand === '+')
    expect(forward).toMatchObject({ start: 3, end: 12 })

    const reverse = orfs.find((feature) => feature.frame === -1 && feature.strand === '-')
    expect(reverse).toMatchObject({ start: 15, end: 24 })
  })

  it('returns exact restriction-site spans and cut positions, including reverse-strand hits', () => {
    const sequence = 'AAGAATTCGGAGACCTT'
    const enzymes = COMMON_RESTRICTION_ENZYMES.filter((enzyme) => enzyme.name === 'EcoRI' || enzyme.name === 'BsaI')
    const sites = scanRestrictionSites(sequence, enzymes)

    const ecoRI = sites.find((site) => site.enzymeName === 'EcoRI' && site.strand === '+')
    expect(ecoRI).toMatchObject({
      start: 2,
      end: 8,
      cutForward: 3,
      cutReverse: 7,
    })

    const bsaIReverse = sites.find((site) => site.enzymeName === 'BsaI' && site.strand === '-')
    expect(bsaIReverse).toMatchObject({
      start: 9,
      end: 15,
      cutForward: 8,
      cutReverse: 4,
    })
  })

  it('resets ORF detection at an IUPAC ambiguity codon inside a would-be ORF', () => {
    // Sequence: ATG (start) + AGR (ambiguous codon with R=A/G) + AAA + TAA (stop)
    // With a canonical sequence "ATGAGAAAATAA" the ORF spans 0–12.
    // But "ATGAGRAAATAA" has an IUPAC ambiguity code (R) at codon position 1,
    // so the ORF must be reset there and no ORF should cover the full span.
    const sequence = 'ATGAGRAAATAA'
    const orfs = detectOrfFeatures(sequence)

    // No ORF should start at 0 and run all the way to 12, because the ambiguous
    // codon at positions 3–5 must reset the in-progress ORF.
    expect(orfs.some((f) => f.strand === '+' && f.start === 0 && f.end === 12)).toBe(false)
  })

  it('filters annotation features by a viewport range using half-open intervals', () => {
    const sequence = 'CCCATGAAATAACCCTTAGGGCATCCCAAGAATTCGGAGACCTT'
    const features = buildAnnotationFeatures(sequence)

    const visible = filterAnnotationFeaturesByRange(features, { start: 0, end: 12 })
    expect(visible.every((feature) => feature.end > 0 && feature.start < 12)).toBe(true)
    expect(visible.some((feature) => feature.type === 'orf' && feature.start === 3 && feature.end === 12)).toBe(true)
    expect(visible.some((feature) => feature.type === 'restriction' && feature.start >= 12)).toBe(false)
  })
})
