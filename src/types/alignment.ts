/**
 * alignment.ts — Data model for reference alignment and variant calling.
 *
 * Ground spec: docs/specs/07-reference-alignment.md + docs/specs/08-variant-calling-review.md
 */

export interface ReferenceAlignment {
  /** Stable UUID for this alignment result. */
  id: string
  /** Id of the trace slot being aligned. */
  subjectId: string
  /** Reference name (from FASTA header or user-supplied label). */
  referenceId: string
  /** Strand on which the best alignment was found. */
  strand: 'forward' | 'reverse'
  /** 1-based position in the reference where the alignment begins (inclusive). */
  refStart: number
  /** 1-based position in the reference where the alignment ends (inclusive). */
  refEnd: number
  /** CIGAR string describing the alignment (M/I/D/S ops). */
  cigar: string
  /** Raw alignment score (higher = better). */
  score: number
  /** 0-based read positions that differ from the reference (substitutions). */
  mismatches: number[]
  /** 0-based read positions immediately before an insertion gap in the reference. */
  insertions: number[]
  /** 0-based reference positions (relative to refStart) of deletions in the read. */
  deletions: number[]
}

export interface CalledVariant {
  /** Stable deterministic id: `${alignmentId}:${position}:${ref}:${alt}` */
  id: string
  /** Id of the ReferenceAlignment this variant was called from. */
  alignmentId: string
  /** 1-based position in the reference. */
  position: number
  /** Reference base(s) at this position (uppercase). */
  ref: string
  /** Alternate base(s) in the read (uppercase). */
  alt: string
  /** Variant class. */
  type: 'snv' | 'insertion' | 'deletion' | 'ambiguous'
  /** Confidence, informed by base quality and IUPAC ambiguity context. */
  confidence: 'high' | 'medium' | 'low'
  /** 0-based read index for SNV/ambiguous calls; -1 for pure deletions. */
  readIndex: number
  /** Review annotation set by the user. */
  review: 'unreviewed' | 'accepted' | 'uncertain' | 'suppressed'
}
