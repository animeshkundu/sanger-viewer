/**
 * contig.ts — PairedContig builder for two-read Sanger contig assembly.
 *
 * Given two reads (forward + reverse), this module:
 *   1. Finds the best ungapped overlap via findBestOverlap().
 *   2. Builds a contig layout (upstream read at offset 0, downstream at
 *      offset = upstreamLength − overlapLength).
 *   3. Constructs per-position support and consensus base calls (quality-
 *      weighted where both reads contribute, IUPAC ambiguity when conflicting).
 *   4. Exports to FASTA.
 *
 * Everything is pure TypeScript with no DOM dependencies.
 */

import { findBestOverlap } from './overlap'

// ── IUPAC resolution (same table as consensus.ts) ───────────────────────────

const IUPAC: Record<string, string> = {
  AC: 'M', AG: 'R', AT: 'W', CG: 'S', CT: 'Y', GT: 'K',
  ACG: 'V', ACT: 'H', AGT: 'D', CGT: 'B', ACGT: 'N',
}

const CANONICAL_ORDER = 'ACGT'

function resolveIupac(bases: string[]): string {
  const upper = [...new Set(bases.map((b) => b.toUpperCase()))]
  const canonical = upper.filter((b) => CANONICAL_ORDER.includes(b)).sort(
    (a, b) => CANONICAL_ORDER.indexOf(a) - CANONICAL_ORDER.indexOf(b),
  )
  const key = canonical.join('')
  return IUPAC[key] ?? 'N'
}

// ── Data model ───────────────────────────────────────────────────────────────

/** Per-position support across the assembled contig. */
export interface PositionSupport {
  /** 0-based index in the contig consensus sequence. */
  consensusIndex: number
  /** Base contributed by the forward-role read (undefined in single-coverage regions). */
  forwardBase?: string
  /** Base contributed by the reverse-role read (undefined in single-coverage regions). */
  reverseBase?: string
  /** Quality score for the forward-role base (null if no quality data). */
  forwardQ?: number | null
  /** Quality score for the reverse-role base (null if no quality data). */
  reverseQ?: number | null
  /** 1 = only one read covers this position; 2 = both reads cover it. */
  coverage: 1 | 2
}

/** The assembled contig from two overlapping Sanger reads. */
export interface PairedContig {
  /** Unique identifier for this contig (stable within a session). */
  id: string
  /** [forwardSlotId, reverseSlotId] — original workspace slot ids. */
  readIds: [string, string]
  /** File name of the forward-role read. */
  fwdName: string
  /** File name of the reverse-role read. */
  revName: string
  /**
   * Orientation used in assembly:
   *   'fr' — seqA was used as-is (forward role), seqB as reverse (possibly RC'd).
   *   'rf' — seqB was used as-is (forward role), seqA as reverse (possibly RC'd).
   */
  orientation: 'fr' | 'rf'
  /** 0-based start of the overlap in contig coordinates. */
  overlapStart: number
  /** 0-based end (inclusive) of the overlap in contig coordinates. */
  overlapEnd: number
  /** Number of bases in the overlap region. */
  overlapLength: number
  /** Total contig length in bases. */
  contigLength: number
  /** The assembled consensus string. */
  consensus: string
  /** Per-position support array (length === contigLength). */
  support: PositionSupport[]
  /** Number of positions in the overlap where fwd and rev bases differ. */
  mismatchCount: number
  /** Number of positions covered by exactly one read. */
  singleCoverageCount: number
}

// ── FASTA export ─────────────────────────────────────────────────────────────

/**
 * Serialise a PairedContig to FASTA format.
 *
 * Header: `>contig [fwdName + revName] {contigLength} bp`
 * Sequence wrapped at 80 characters per line, trailing newline.
 */
export function toContigFasta(contig: PairedContig): string {
  const header = `>contig [${contig.fwdName} + ${contig.revName}] ${contig.contigLength} bp`
  const lines = contig.consensus.match(/.{1,80}/g) ?? []
  return `${header}\n${lines.join('\n')}\n`
}

// ── Builder ──────────────────────────────────────────────────────────────────

let _contigIdCounter = 0
function generateContigId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  _contigIdCounter += 1
  return `contig-${_contigIdCounter.toString(36)}-${Date.now().toString(36)}`
}

/**
 * Build a PairedContig from two reads.
 *
 * @param idA     Workspace slot id for read A.
 * @param nameA   File name for read A.
 * @param seqA    Base-call sequence for read A (forward orientation).
 * @param qualA   Quality scores for read A (null if unavailable).
 * @param idB     Workspace slot id for read B.
 * @param nameB   File name for read B.
 * @param seqB    Base-call sequence for read B (as stored — revcomp handled internally).
 * @param qualB   Quality scores for read B (null if unavailable).
 * @param minOverlap  Minimum overlap length (default 20).
 *
 * @returns A PairedContig, or null if no valid overlap was found.
 */
export function buildPairedContig(
  idA: string,
  nameA: string,
  seqA: string,
  qualA: number[] | null,
  idB: string,
  nameB: string,
  seqB: string,
  qualB: number[] | null,
  minOverlap = 20,
): PairedContig | null {
  const overlap = findBestOverlap(seqA, seqB, minOverlap)
  if (!overlap) return null

  const { upstreamSeq, downstreamSeq, overlapLength, orientation } = overlap

  // Determine which original read takes which role.
  const fwdIsA = overlap.fwdIsA
  const fwdId   = fwdIsA ? idA   : idB
  const revId   = fwdIsA ? idB   : idA
  const fwdName = fwdIsA ? nameA : nameB
  const revName = fwdIsA ? nameB : nameA

  // Resolve quality arrays in the correct orientation.
  // When the downstream read was reverse-complemented, its qualities are also reversed.
  const qualFwd: number[] | null = fwdIsA ? qualA : qualB
  let qualRev: number[] | null

  const revWasRC = (orientation === 'fwd-rc' && fwdIsA) ||
                   (orientation === 'rev-rc' && !fwdIsA)

  if (revWasRC) {
    const rawRevQual = fwdIsA ? qualB : qualA
    qualRev = rawRevQual ? rawRevQual.slice().reverse() : null
  } else {
    qualRev = fwdIsA ? qualB : qualA
  }

  // Layout in contig coordinates:
  //   upstream  → positions [0, upstreamLen)
  //   downstream → positions [upstreamLen − overlapLength, contigLength)
  const upstreamLen   = upstreamSeq.length
  const downstreamLen = downstreamSeq.length
  const downstreamOffset = upstreamLen - overlapLength
  const contigLength = downstreamOffset + downstreamLen

  const overlapStart = downstreamOffset          // 0-based, inclusive
  const overlapEnd   = upstreamLen - 1           // 0-based, inclusive

  // Build support and consensus position-by-position.
  const support: PositionSupport[] = []
  const consensusBases: string[] = []
  let mismatchCount = 0
  let singleCoverageCount = 0

  for (let pos = 0; pos < contigLength; pos++) {
    const fwdIdx = pos                             // upstream read index
    const revIdx = pos - downstreamOffset          // downstream read index

    const hasFwd = fwdIdx >= 0 && fwdIdx < upstreamLen
    const hasRev = revIdx >= 0 && revIdx < downstreamLen

    const fwdBase = hasFwd ? upstreamSeq[fwdIdx].toUpperCase()   : undefined
    const revBase = hasRev ? downstreamSeq[revIdx].toUpperCase() : undefined
    const fwdQ    = hasFwd ? (qualFwd?.[fwdIdx] ?? null)         : undefined
    const revQ    = hasRev ? (qualRev?.[revIdx] ?? null)         : undefined

    const coverage: 1 | 2 = hasFwd && hasRev ? 2 : 1

    let consensusBase: string
    if (coverage === 1) {
      singleCoverageCount += 1
      consensusBase = (fwdBase ?? revBase)!
    } else {
      // Both reads cover this position.
      const fb = fwdBase!
      const rb = revBase!
      if (fb === rb) {
        consensusBase = fb
      } else {
        mismatchCount += 1
        // Quality-weighted: prefer the base with higher quality; tie → IUPAC.
        const fq = fwdQ ?? 0
        const rq = revQ ?? 0
        if (fq > rq) {
          consensusBase = fb
        } else if (rq > fq) {
          consensusBase = rb
        } else {
          // Equal quality (or both unknown) — emit IUPAC ambiguity code.
          consensusBase = resolveIupac([fb, rb])
        }
      }
    }

    support.push({
      consensusIndex: pos,
      forwardBase: fwdBase,
      reverseBase: revBase,
      forwardQ: fwdQ,
      reverseQ: revQ,
      coverage,
    })
    consensusBases.push(consensusBase)
  }

  return {
    id: generateContigId(),
    readIds: [fwdId, revId],
    fwdName,
    revName,
    orientation: fwdIsA ? 'fr' : 'rf',
    overlapStart,
    overlapEnd,
    overlapLength,
    contigLength,
    consensus: consensusBases.join(''),
    support,
    mismatchCount,
    singleCoverageCount,
  }
}
