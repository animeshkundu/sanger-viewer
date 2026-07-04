/**
 * tm.ts — Nearest-neighbor Tm, GC%, hairpin, and self-dimer utilities.
 *
 * Tm formula (SantaLucia 1998 unified parameters):
 *   Tm = (ΔH° × 1000) / (ΔS° + R × ln(cT / 4)) − 273.15  [°C]
 *
 * Default assumptions:
 *   cT (total strand concentration) = 250 nM (typical primer conc)
 *   [Na⁺] = 50 mM  →  salt correction applied
 *   R = 1.987 cal/mol·K
 *
 * All ΔH values are in kcal/mol, ΔS in cal/mol·K (SantaLucia 1998 Table 2).
 */

const R = 1.987 // cal / (mol·K)

/**
 * Nearest-neighbor parameters — SantaLucia 1998 unified set.
 * Keys are 5′→3′ dinucleotide on the top strand; values are [ΔH, ΔS].
 * ΔH in kcal/mol, ΔS in cal/mol·K.
 */
const NN_PARAMS: Record<string, [number, number]> = {
  AA: [-7.9,  -22.2],
  AT: [-7.2,  -20.4],
  TA: [-7.2,  -21.3],
  CA: [-8.5,  -22.7],
  GT: [-8.4,  -22.4],
  CT: [-7.8,  -21.0],
  GA: [-8.2,  -22.2],
  CG: [-10.6, -27.2],
  GC: [-9.8,  -24.4],
  GG: [-8.0,  -19.9],
  AC: [-8.4,  -22.4],  // = GT/CA complement (rev-comp of AC read 5'→3' is GT)
  TC: [-8.2,  -22.2],  // = GA complement
  AG: [-7.8,  -21.0],  // = CT (complement used for symmetry)
  TG: [-8.5,  -22.7],  // = CA complement
  TT: [-7.9,  -22.2],  // = AA complement
  CC: [-8.0,  -19.9],  // = GG complement
}

/** Initiation parameters per 5′-terminal base (SantaLucia 1998). */
const INIT_PARAMS: Record<string, [number, number]> = {
  A: [2.3,  4.1],
  T: [2.3,  4.1],
  C: [0.1, -2.8],
  G: [0.1, -2.8],
}

/** Simple IUPAC → canonical base mapping (for degenerate handling). */
const IUPAC_PRIMARY: Record<string, string> = {
  A: 'A', C: 'C', G: 'G', T: 'T',
  R: 'A', Y: 'C', S: 'G', W: 'A',
  K: 'G', M: 'A', B: 'C', D: 'A',
  H: 'A', V: 'A', N: 'A',
}

function toCanonical(seq: string): string {
  return seq.toUpperCase().split('').map((b) => IUPAC_PRIMARY[b] ?? 'A').join('')
}

/**
 * Compute GC% for a primer sequence (IUPAC-tolerant).
 */
export function computeGC(sequence: string): number {
  const upper = sequence.toUpperCase()
  let gc = 0
  let total = 0
  for (const ch of upper) {
    if (ch === 'G' || ch === 'C' || ch === 'S') {
      gc++
      total++
    } else if (/[ACGTRYWKMBDHVN]/.test(ch)) {
      total++
    }
  }
  return total === 0 ? 0 : (gc / total) * 100
}

/**
 * Compute nearest-neighbor Tm (SantaLucia 1998) for a primer sequence.
 *
 * @param sequence   Primer sequence (5′→3′, IUPAC).
 * @param cT_nM      Total primer strand concentration in nM (default 250 nM).
 * @param saltMM     Na⁺ concentration in mM (default 50 mM, for salt correction).
 * @returns Tm in °C.
 */
export function computeTm(sequence: string, cT_nM = 250, saltMM = 50): number {
  const seq = toCanonical(sequence)
  const n = seq.length
  if (n < 2) return 0

  let dH = 0 // kcal/mol
  let dS = 0 // cal/mol·K

  // 5′ terminal initiation
  const fivePrime = seq[0]
  const threePrime = seq[n - 1]
  const initFive  = INIT_PARAMS[fivePrime]  ?? INIT_PARAMS['A']
  const initThree = INIT_PARAMS[threePrime] ?? INIT_PARAMS['A']
  dH += initFive[0]  + initThree[0]
  dS += initFive[1]  + initThree[1]

  // Nearest-neighbor stacking
  for (let i = 0; i < n - 1; i++) {
    const dinuc = seq[i] + seq[i + 1]
    const [ndH, ndS] = NN_PARAMS[dinuc] ?? [-8.0, -20.0]
    dH += ndH
    dS += ndS
  }

  const cT_mol = (cT_nM * 1e-9)   // M
  const dS_R   = dS + R * Math.log(cT_mol / 4)

  // Tm in Kelvin → Celsius
  const tmK = (dH * 1000) / dS_R
  let tmC = tmK - 273.15

  // Salt correction: +16.6 × log10([Na+]) — approximate Marmur adjustment
  tmC += 16.6 * Math.log10(saltMM / 1000)

  return Math.round(tmC * 10) / 10
}

// ── Complement ────────────────────────────────────────────────────────────────

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', N: 'N',
  R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M',
  M: 'K', B: 'V', V: 'B', D: 'H', H: 'D',
}

function complement(base: string): string {
  return COMPLEMENT[base.toUpperCase()] ?? 'N'
}

function reverseComplement(seq: string): string {
  return seq.toUpperCase().split('').reverse().map(complement).join('')
}

// ── Hairpin detection ─────────────────────────────────────────────────────────

/**
 * Estimate hairpin Tm using a simple stem-loop scan.
 *
 * Strategy: for each possible stem start `i` and stem length `L` ≥ 3,
 * check whether the primer can fold so that bases [i..i+L-1] pair with
 * bases [i+L+loop..i+2L+loop-1] (loop ≥ 3).  Count GC pairs in the stem,
 * estimate Tm via a rough formula, and return the max Tm found (or null).
 */
export function computeHairpinTm(sequence: string): number | null {
  const seq = toCanonical(sequence)
  const n = seq.length
  let bestTm: number | null = null

  for (let stemLen = 3; stemLen <= Math.floor((n - 3) / 2); stemLen++) {
    for (let i = 0; i + stemLen * 2 + 3 <= n; i++) {
      const leftArm  = seq.slice(i, i + stemLen)
      const minLoop  = 3
      for (let loop = minLoop; i + stemLen + loop + stemLen <= n; loop++) {
        const rightArm = seq.slice(i + stemLen + loop, i + stemLen + loop + stemLen)
        const rcRight  = reverseComplement(rightArm)

        let gcCount  = 0
        let misMatch = 0
        for (let k = 0; k < stemLen; k++) {
          if (leftArm[k] === rcRight[k]) {
            if (leftArm[k] === 'G' || leftArm[k] === 'C') gcCount++
          } else {
            misMatch++
          }
        }

        if (misMatch <= 1) {
          // Rough Tm for a short hairpin stem (Wallace-like): 2*(AT pairs) + 4*(GC pairs)
          const atPairs = stemLen - gcCount - misMatch
          const tm = 2 * atPairs + 4 * gcCount
          if (bestTm === null || tm > bestTm) bestTm = tm
        }
        break // only check loop=3 for efficiency
      }
    }
  }

  return bestTm
}

// ── Self-dimer scoring ────────────────────────────────────────────────────────

/**
 * Compute a self-dimer score: the maximum number of contiguous complementary
 * base-pairs in any ungapped alignment of the primer against its own reverse
 * complement (including anti-parallel alignments).
 *
 * Returns the count of complementary base-pairs in the best alignment window.
 */
export function computeSelfDimerScore(sequence: string): number {
  const seq  = toCanonical(sequence)
  const rc   = reverseComplement(seq)
  const n    = seq.length
  let best   = 0

  // Slide seq against rc in all offsets (anti-parallel alignment).
  for (let offset = -(n - 1); offset < n; offset++) {
    const startA = Math.max(0, -offset)
    const startB = Math.max(0,  offset)
    const len    = Math.min(n - startA, n - startB)

    let matches = 0
    let run     = 0
    for (let k = 0; k < len; k++) {
      if (seq[startA + k] === rc[startB + k]) {
        run++
        matches = Math.max(matches, run)
      } else {
        run = 0
      }
    }
    best = Math.max(best, matches)
  }

  return best
}

// ── Quality flags ─────────────────────────────────────────────────────────────

/**
 * Return a list of human-readable quality flags for a primer.
 */
export function computePrimerFlags(
  sequence: string,
  gcPercent: number,
  tmCelsius: number,
  hairpinTm: number | null,
  selfDimerScore: number,
): string[] {
  const flags: string[] = []
  const n = sequence.length

  if (n < 18) flags.push('short (<18 bp)')
  if (n > 30) flags.push('long (>30 bp)')
  if (gcPercent < 40) flags.push('low GC (<40%)')
  if (gcPercent > 65) flags.push('high GC (>65%)')
  if (tmCelsius < 50) flags.push('low Tm (<50°C)')
  if (tmCelsius > 72) flags.push('high Tm (>72°C)')
  if (hairpinTm !== null && hairpinTm >= 40) flags.push('hairpin risk')
  if (selfDimerScore >= 4) flags.push('self-dimer risk')

  // 3′ end homopolymer (last 5 bases)
  const end5 = sequence.slice(-5).toUpperCase()
  const endCounts: Record<string, number> = {}
  for (const b of end5) endCounts[b] = (endCounts[b] ?? 0) + 1
  if (Object.values(endCounts).some((c) => c >= 4)) flags.push("3′ homopolymer")

  // 3′ G/C clamp check (prefer G or C at 3′)
  const lastBase = sequence[sequence.length - 1].toUpperCase()
  if (lastBase !== 'G' && lastBase !== 'C') flags.push("3′ no G/C clamp")

  return flags
}
