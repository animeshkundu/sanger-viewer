export type AnnotationFeatureType = 'orf' | 'restriction'
export type AnnotationStrand = '+' | '-'
export type AnnotationRow = 'orf+1' | 'orf+2' | 'orf+3' | 'restriction' | 'orf-1' | 'orf-2' | 'orf-3'

interface AnnotationFeatureBase {
  id: string
  type: AnnotationFeatureType
  name: string
  start: number
  end: number
  strand: AnnotationStrand
  row: AnnotationRow
}

export interface OrfFeature extends AnnotationFeatureBase {
  type: 'orf'
  frame: 1 | 2 | 3
}

export interface RestrictionFeature extends AnnotationFeatureBase {
  type: 'restriction'
  enzyme: string
  recognitionSequence: string
  cutPositions: [number, number]
}

export type AnnotationFeature = OrfFeature | RestrictionFeature
