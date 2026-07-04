# Fixture provenance

## Real public Sanger trace files

Used for parser and E2E coverage.  All real files are committed verbatim from
their upstream source for deterministic offline tests.

- `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1`
  - Source: Biopython test corpus (`Tests/Abi`)
  - URL: https://github.com/biopython/biopython/tree/71ab98b8d2f5c1574ec4d3c90b432d300359d0d4/Tests/Abi
  - License: Biopython project license (open source test data)
- `fixtures/large/3730.ab1`
  - Source: Biopython test corpus (`Tests/Abi/3730.ab1`), 1 165 bases, 300 KB
  - URL: https://github.com/biopython/biopython/blob/71ab98b8d2f5c1574ec4d3c90b432d300359d0d4/Tests/Abi/3730.ab1
- `fixtures/scf/abcZ_F.scf`
  - Source: CutePeaks example corpus
  - URL: https://github.com/labsquare/CutePeaks/blob/591d3e0556576c7089198bb6a0b50b31cfa1d074/examples/abcZ_F.scf
  - License: repository open-source distribution of example sequencing files

## Deterministically synthesised ABIF fixtures

Synthesised by `scripts/generate-fixtures.ts` — **no real patient or lab data**.
Committed binaries are reproducible: running the generator with the same seed
produces byte-for-byte identical output.

Signal model: per-base Gaussian bump centred on the peak position.  Amplitude
and cross-talk noise are drawn from a seeded Linear Congruential Generator
(Numerical Recipes parameters: a = 1 664 525, c = 1 013 904 223, m = 2³²).

Binary layout: minimal valid ABIF format understood by `src/parsers/abif.ts`:
magic `ABIF` + version 101, root directory entry at offset 6, 8 directory
entries (FWO_1, DATA9–12, PBAS2, PLOC2, PCON2), data sections from offset 258.

| File | Bases | Samples/base | Samples total | Quality range | Seed | Purpose |
|---|---|---|---|---|---|---|
| `fixtures/ab1/synth-small-500bp.ab1` | 500 | 10 | 5 000 | Phred 20–40 | 0xDEADBEEF | Small/typical coverage |
| `fixtures/large/synth-large-3kbp.ab1` | 3 000 | 10 | 30 000 | Phred 20–40 | 0xCAFEBABE | Multi-thousand-base stress |
| `fixtures/large/synth-lowq-800bp.ab1` | 800 | 10 | 8 000 | Phred 5–15 | 0xBAADF00D | Low-quality / noisy trace |
| `fixtures/large/synth-longread-5kbp.ab1` | 5 000 | 10 | 50 000 | Phred 15–35 | 0x0FACADE0 | Long-read stress |
