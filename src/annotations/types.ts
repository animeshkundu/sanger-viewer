export interface BaseRange {
  start: number
  end: number
}

interface AnnotationFeatureBase extends BaseRange {
  id: string
  type: 'orf' | 'restriction'
  label: string
}

export interface OrfFeature extends AnnotationFeatureBase {
  type: 'orf'
  strand: '+' | '-'
  frame: number
}

export interface RestrictionEnzyme {
  name: string
  recognitionSequence: string
  cutOffsets: {
    forward: number
    reverse: number
  }
}

export interface RestrictionSiteFeature extends AnnotationFeatureBase {
  type: 'restriction'
  strand: '+' | '-'
  enzymeName: string
  recognitionSequence: string
  cutForward: number
  cutReverse: number
}

export type AnnotationFeature = OrfFeature | RestrictionSiteFeature
