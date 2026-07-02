# Fixture provenance

Real public Sanger trace files used for parser and E2E coverage:

- `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1`
  - Source: Biopython test corpus (`Tests/Abi`)
  - URL: https://github.com/biopython/biopython/tree/71ab98b8d2f5c1574ec4d3c90b432d300359d0d4/Tests/Abi
  - License: Biopython project license (open source test data)
- `fixtures/large/3730.ab1`
  - Source: Biopython test corpus (`Tests/Abi/3730.ab1`), selected as larger file for performance smoke checks
  - URL: https://github.com/biopython/biopython/blob/71ab98b8d2f5c1574ec4d3c90b432d300359d0d4/Tests/Abi/3730.ab1
- `fixtures/scf/abcZ_F.scf`
  - Source: CutePeaks example corpus
  - URL: https://github.com/labsquare/CutePeaks/blob/591d3e0556576c7089198bb6a0b50b31cfa1d074/examples/abcZ_F.scf
  - License: repository open-source distribution of example sequencing files

All fixtures are real trace files and are intentionally committed for deterministic offline tests.
