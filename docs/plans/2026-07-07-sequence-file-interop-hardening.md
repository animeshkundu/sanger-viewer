# Sequence-file interop hardening implementation plan

Date: 2026-07-07  
Owner: sanger-viewer maintainers  
Controller marker: 39357c52-47fd-4b6f-9abc-58c8770da576

## Goal

Ship robust, browser-only sequence-file interop in small CI-green PRs: SnapGene `.dna`, GenBank, and FASTA records preserve sequence features, primers, and notes on round-trip, while `.ab1`/`.scf` parsing fails gracefully for corrupt/truncated files and scales to a documented real-world ABI corpus.

## Non-goals

- No backend service.
- No WASM parser.
- No private or unpublished biological data in fixtures.
- No broad UI redesign in parser-foundation PRs.
- No relaxed tests, skipped tests, or screenshot-gate bypasses.

## PR sequence

### PR 1 — Binary parser error hardening

**Scope**
- Add a small parser-error type and bounds-check helpers for binary reads.
- Apply them to AB1 and SCF header, directory, sample, base-call, and quality reads.
- Keep public `TraceData` unchanged.

**Tests**
- Short AB1 header returns a friendly unsupported/truncated error.
- Truncated ABIF directory returns a typed parse error.
- Missing required AB1 tags still returns a clear missing-field error.
- Truncated SCF sample/base blocks return typed parse errors.
- Worker returns `{ ok: false, error }` with no unhandled exception.

**Validation**
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

### PR 2 — SequenceRecord model + FASTA

**Scope**
- Add `SequenceRecord`, `SequenceFeature`, `SequencePrimer`, `SequenceNote`, and coordinate/location types.
- Add deterministic normalization and checksum helpers.
- Add FASTA parser/writer for single-record reference import/export.
- Document that FASTA carries sequence/name only and cannot preserve features/primers/notes.

**Tests**
- Multi-line FASTA imports to the expected sequence.
- Writer wraps deterministically and re-imports to the same record name/sequence.
- Invalid/empty FASTA returns a friendly parser error.

**Validation**
- Unit tests plus full lint/typecheck/test/build.

### PR 3 — GenBank parser

**Scope**
- Parse LOCUS, DEFINITION, ACCESSION/VERSION when present, FEATURES, qualifiers, ORIGIN, topology, and circular/linear markers.
- Normalize simple, complement, join, and circular wraparound locations.
- Preserve unknown qualifiers as arrays.

**Tests**
- Minimal linear GenBank fixture.
- Circular plasmid fixture with CDS/gene/misc_feature.
- Primer-like feature fixture.
- Unknown qualifier preservation.
- Invalid/truncated GenBank friendly errors.

**Validation**
- Unit tests plus full lint/typecheck/test/build.

### PR 4 — Deterministic GenBank writer and round-trip gate

**Scope**
- Write deterministic GenBank from `SequenceRecord`.
- Preserve feature order, location semantics, and qualifiers.
- Add normalized equality helpers for round-trip assertions.

**Tests**
- Parse -> write -> parse equality for all GenBank fixtures.
- Feature/primer/note zero-loss manifest comparisons.
- Snapshot only for stable writer output where it aids review.

**Validation**
- Unit tests plus full lint/typecheck/test/build.

### PR 5 — Addgene SnapGene `.dna` fixture and parser

**Scope**
- Add one public Addgene `.dna` fixture with provenance and checksum.
- Implement a TypeScript SnapGene block parser for sequence, topology, features, primers, notes, and key metadata.
- Preserve unknown required metadata in `rawMetadata`.

**Tests**
- Addgene `.dna` imports to expected manifest.
- `.dna` -> GenBank -> re-import has zero feature/primer/note loss.
- Truncated `.dna` returns a friendly typed parser error.

**Validation**
- Unit tests plus full lint/typecheck/test/build.

### PR 6 — ABI corpus expansion

**Scope**
- Add or generate provenance for >=100 public ABI files from >=3 instrument models.
- Keep files legally usable, deterministic, and documented.
- Add sentinels rather than huge snapshots: model, base count, selected base positions, quality availability, checksum.

**Tests**
- Corpus test enumerates all real ABI fixtures.
- Asserts correct base calls and quality sentinels.
- Includes a performance budget for parse throughput.

**Validation**
- `npm run test`
- `npm run perf:smoke`
- Full lint/typecheck/build.

### PR 7 — Worker-backed UX integration

**Scope**
- Route `.dna`, GenBank, and FASTA import through a worker-backed parser path.
- Add design-system-consistent loading, empty, and error states for sequence-record imports.
- Preserve current trace open-to-chromatogram flow and all existing power features.

**Tests and gates**
- E2E import tests for success and failure states.
- `npm run ux:gallery` with screenshots for sequence-record empty/loading/error/success states in light/dark and narrow/mobile where applicable.
- Written UX-quality review in the PR body.

**Validation**
- Full lint/typecheck/test/build.
- E2E, perf smoke, and UX gallery gates.

## Shared acceptance criteria for every PR

- Keep the PR small and independently shippable.
- Include the controller marker in the PR body.
- Add or strengthen tests for each behavior change.
- Run the nearest targeted tests before the full validation suite.
- Secret-scan changed files before committing.
- Update devlog/blog evidence for behavior, fixture, or workflow changes.
- Do not add generated build artifacts, dependency folders, private data, or unrelated cleanup.

## Open questions for implementation owners

1. Which public Addgene `.dna` file should be the canonical fixture, and what license/provenance text should accompany it?
2. Should SnapGene `.dna` export be required in the first implementation wave, or is `.dna` import plus GenBank export enough for the first zero-loss migration path?
3. Where should large ABI fixture storage live if the corpus makes repository checkout too heavy?
4. Which UI surface should own sequence-record imports: the existing reference panel, a new import route, or the multi-trace workspace sidebar?

## Evidence links

- Research artifact: `/home/runner/work/sanger-viewer/sanger-viewer/docs/research/2026-07-07-sequence-file-interop-hardening.md`
- Current AB1 parser: `/home/runner/work/sanger-viewer/sanger-viewer/src/parsers/abif.ts`
- Current SCF parser: `/home/runner/work/sanger-viewer/sanger-viewer/src/parsers/scf.ts`
- Worker parser boundary: `/home/runner/work/sanger-viewer/sanger-viewer/src/workers/parser.worker.ts`
- Reference-record context spec: `/home/runner/work/sanger-viewer/sanger-viewer/docs/specs/04-reference-record-context.md`
- Fixture provenance: `/home/runner/work/sanger-viewer/sanger-viewer/fixtures/PROVENANCE.md`
