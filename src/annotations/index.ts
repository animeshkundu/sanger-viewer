import { detectOrfFeatures } from './orfs'
import { scanRestrictionSiteFeatures } from './restrictionSites'
import type { AnnotationFeature } from './types'

export type { AnnotationFeature, AnnotationRow, AnnotationStrand, OrfFeature, RestrictionFeature } from './types'
export { COMMON_RESTRICTION_ENZYMES, scanRestrictionSiteFeatures, type RestrictionEnzyme } from './restrictionSites'
export { detectOrfFeatures } from './orfs'

export interface AnnotationBaseRange {
  start: number
  end: number
}

export const ANNOTATION_ROW_ORDER = ['orf+1', 'orf+2', 'orf+3', 'restriction', 'orf-1', 'orf-2', 'orf-3'] as const

export function buildAnnotationFeatures(sequence: string): AnnotationFeature[] {
  const features = [...detectOrfFeatures(sequence), ...scanRestrictionSiteFeatures(sequence)]
  return features.sort((a, b) => a.start - b.start || a.end - b.end || a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
}

export function filterAnnotationFeaturesByRange(
  features: readonly AnnotationFeature[],
  range: AnnotationBaseRange,
  paddingBases = 0,
): AnnotationFeature[] {
  const start = Math.max(0, range.start - paddingBases)
  const end = Math.max(start, range.end + paddingBases)
  return features.filter((feature) => feature.end > start && feature.start < end)
}
