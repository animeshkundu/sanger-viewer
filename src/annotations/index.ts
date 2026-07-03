import { detectOrfFeatures } from './orfs'
import { COMMON_RESTRICTION_ENZYMES, scanRestrictionSites } from './restrictionSites'
import type { AnnotationFeature, BaseRange, RestrictionEnzyme } from './types'

export type { AnnotationFeature, BaseRange, OrfFeature, RestrictionEnzyme, RestrictionSiteFeature } from './types'
export { COMMON_RESTRICTION_ENZYMES, detectOrfFeatures, scanRestrictionSites }

export function buildAnnotationFeatures(
  displaySequence: string,
  enzymes: RestrictionEnzyme[] = COMMON_RESTRICTION_ENZYMES,
): AnnotationFeature[] {
  return [...detectOrfFeatures(displaySequence), ...scanRestrictionSites(displaySequence, enzymes)].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (a.end !== b.end) return a.end - b.end
    return a.label.localeCompare(b.label)
  })
}

export function filterAnnotationFeaturesByRange(
  features: AnnotationFeature[],
  visibleRange: BaseRange,
  paddingBases = 0,
): AnnotationFeature[] {
  const windowStart = Math.max(0, visibleRange.start - paddingBases)
  const windowEnd = Math.max(windowStart, visibleRange.end + paddingBases)
  return features.filter((feature) => feature.end > windowStart && feature.start < windowEnd)
}
