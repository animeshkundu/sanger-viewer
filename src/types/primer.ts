/**
 * primer.ts — shared type definitions for the primer design + in-silico PCR feature.
 */

/** A single primer entry as entered/computed by the user. */
export interface PrimerEntry {
  id: string
  name: string
  sequence: string
  direction: 'forward' | 'reverse'
  gcPercent: number
  tmCelsius: number
  /** Estimated Tm of the most stable hairpin, or null if no hairpin found. */
  hairpinTm: number | null
  /** Score of the worst self-dimer (max complementary base-pairs in any alignment). */
  selfDimerScore: number
  /** Human-readable quality flags (e.g. "low GC", "hairpin risk", "3′ homopolymer"). */
  flags: string[]
}

/** A primer binding site found on a template sequence. */
export interface PrimerBindingSite {
  primerId: string
  /** Strand orientation of the match relative to the template. */
  strand: 'forward' | 'reverse'
  /** 1-based start position on the template (inclusive). */
  start: number
  /** 1-based end position on the template (inclusive). */
  end: number
  mismatches: number
  threeEndMismatches: number
}

/** A predicted PCR amplicon produced by one forward and one reverse binding site. */
export interface PredictedAmplicon {
  id: string
  forwardSiteStart: number
  reverseSiteEnd: number
  size: number
  circularWrap: boolean
  mismatches: { forward: number; reverse: number }
  sequence: string
}

/** Aggregated result for a primer pair: their properties + all binding sites + predicted amplicons. */
export interface PrimerPairResult {
  forward: PrimerEntry
  reverse: PrimerEntry
  forwardSites: PrimerBindingSite[]
  reverseSites: PrimerBindingSite[]
  amplicons: PredictedAmplicon[]
}
