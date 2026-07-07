# Sequence-file interop hardening research

Date: 2026-07-07  
Owner: sanger-viewer maintainers  
Controller marker: 39357c52-47fd-4b6f-9abc-58c8770da576

## Context

This research scopes the SnapGene migration blocker for sanger-viewer: trusted, browser-only import/export of plasmid sequence records and robust Sanger trace parsing. The target user is a bench scientist who receives a SnapGene `.dna`, Addgene plasmid map, GenBank record, FASTA sequence, or Sanger `.ab1`/`.scf` trace and expects the app to preserve scientifically meaningful context without uploading files.

This is a planning/research slice. It does not change parser behavior; it records the current gaps, the minimum durable data model, and the test evidence required for implementation PRs.

## Current repository state

| Area | Current evidence | Gap for this work unit |
|---|---|---|
| Trace format detection | `src/parsers/index.ts` detects only `ABIF` and `.scf` headers, then dispatches to AB1 or SCF parsers. | No SnapGene `.dna`, GenBank, or FASTA record parser/import path in the shared parser layer. |
| AB1 parsing | `src/parsers/abif.ts` reads ABIF directory entries and tags needed for channels, base calls, peak locations, qualities, and selected metadata. | Directory and payload bounds are not validated before `DataView` reads, so corrupt/truncated files rely on low-level exceptions instead of domain-specific graceful errors. |
| SCF parsing | `src/parsers/scf.ts` reads SCF header, samples, bases, peak locations, and per-base probabilities. | Header offsets and base/sample blocks are not preflighted against buffer length. |
| Worker isolation | `src/workers/parser.worker.ts` catches parser exceptions and returns `{ ok: false, error }`; `src/components/TraceViewer.ts` parses trace files off the main thread. | Record import should reuse this worker boundary or an equivalent worker path so `.dna`/GenBank parsing never blocks the main thread. |
| Reference scope | `docs/specs/04-reference-record-context.md` proposes FASTA and GenBank reference import with features. | The spec does not cover SnapGene `.dna`, primers, notes, round-trip export, or lossless feature qualifier preservation. |
| Existing fixture corpus | `fixtures/PROVENANCE.md` documents 3 real public trace files and 4 synthetic ABIF fixtures. | Acceptance requires >=100 real ABI files from >=3 instrument models plus a real Addgene `.dna` round-trip fixture/provenance. |
| Export surface | `src/export/fasta.ts` and related export modules cover FASTA/FASTQ/QUAL for traces and consensus outputs. | No GenBank writer, no SnapGene `.dna` writer, and no reference-record round-trip invariants. |

## Competitor and migration benchmark

| Tool | Interop strength users expect | sanger-viewer opportunity |
|---|---|---|
| SnapGene | Native `.dna` records preserve rich plasmid context: topology, features, primers, labels/notes, and GenBank interchange for collaborators. | Be the zero-install viewer that opens SnapGene-origin records locally and round-trips through GenBank without feature/primer/note loss. |
| Benchling | Cloud workspace stores sequence records, annotations, primers, and collaboration metadata together. | Offer private, no-account local import/export for users who cannot put files into a cloud notebook. |
| Chromas / ChromasPro | Strong Sanger trace inspection and desktop batch/file workflows; ChromasPro adds more sequence-analysis context. | Match trace robustness while avoiding install/platform friction and preserving existing browser UX. |
| FinchTV | Familiar lightweight trace viewing for `.ab1` inspection. | Keep fast open-to-chromatogram behavior while adding modern error states and richer reference-record interop. |
| ApE | Free plasmid editor with GenBank/SnapGene-adjacent cloning workflows and Sanger review context. | Preserve ApE-like lightweight local affordances in the browser, with first-class accessibility and dark/light design-system consistency. |

Migration-blocker conclusion: SnapGene users will not switch for trace viewing alone if plasmid maps lose features, primer annotations, or notes. The critical implementation path is therefore record fidelity first, then visual delight on top of a trustworthy import/export core.

## Required record model

Implementation should introduce a sequence-record model separate from `TraceData` so chromatogram traces and plasmid/reference records can evolve independently:

```ts
interface SequenceRecord {
  id: string
  name: string
  description?: string
  sequence: string
  moleculeType?: 'DNA' | 'RNA' | 'protein'
  topology: 'linear' | 'circular' | 'unknown'
  createdAt?: string
  updatedAt?: string
  sourceFormat: 'snapgene-dna' | 'genbank' | 'fasta'
  features: SequenceFeature[]
  primers: SequencePrimer[]
  notes: SequenceNote[]
  rawMetadata: Record<string, unknown>
}

interface SequenceFeature {
  id: string
  type: string
  name?: string
  location: SequenceLocation
  qualifiers: Record<string, string[]>
}

interface SequencePrimer {
  id: string
  name: string
  sequence: string
  location?: SequenceLocation
  direction?: 'forward' | 'reverse' | 'unknown'
  qualifiers: Record<string, string[]>
}

interface SequenceNote {
  key: string
  value: string
}
```

Lossless round-trip requires keeping unrecognized GenBank qualifiers and SnapGene block metadata in `rawMetadata` until the writer can faithfully re-emit or explicitly mark unsupported fields.

## Fixture and provenance requirements

1. **Addgene `.dna` fixture**
   - Use one public Addgene plasmid SnapGene file with an explicit license/provenance entry.
   - Store a minimal expected-manifest JSON beside the binary: record name, topology, sequence length/hash, feature names/types/locations, primer names/locations/sequences, and note key/value hashes.
   - Do not include any patient, private lab, or unpublished sequence data.
2. **GenBank round-trip fixture**
   - Export the Addgene `.dna` record to GenBank, re-import it, and assert zero loss against the manifest for sequence, topology, features, primers, and notes.
   - Keep writer output deterministic: stable line wrapping, qualifier ordering, and date handling.
3. **ABI robustness corpus**
   - Expand `fixtures/PROVENANCE.md` to document >=100 real ABI files from >=3 instrument models.
   - Track each fixture's source URL/commit, license, instrument model when known, expected base count, selected sequence sentinels, quality availability, and checksum.
4. **Corrupt/truncated corpus**
   - Generate tiny derived fixtures in tests from public fixtures by slicing buffers at critical boundaries rather than committing many damaged binaries.
   - Assert user-facing parser errors, not `RangeError`, unhandled worker errors, or app crashes.

## Parser and worker risks

- **Binary format risk:** SnapGene `.dna` is a block/chunked binary format. The first implementation must be a small, typed parser for the blocks needed to preserve sequence, features, primers, notes, topology, and metadata; it must not add WASM or a backend.
- **Coordinate risk:** GenBank uses 1-based inclusive locations with joins/complements; internal UI utilities often use 0-based ranges. The import layer must normalize coordinates once and writers must convert back with tests for simple, complement, join, and wraparound circular locations.
- **Qualifier risk:** `/note`, `/label`, `/gene`, `/product`, `/ApEinfo_*`, primer annotations, and unknown qualifiers must not be flattened into display-only strings.
- **Performance risk:** Large plasmids and 100-file ABI test runs should parse in workers with typed arrays; tests should include a budget so first-run UX remains instant.
- **Error UX risk:** Graceful parser errors should identify the format and likely issue, e.g. “AB1 file is truncated before DATA9 channel data,” without exposing implementation stack traces.

## Prioritized implementation backlog

1. **Parser hardening first**
   - Add shared bounds-check helpers for binary parsers.
   - Convert AB1/SCF truncated/corrupt reads into typed parse errors.
   - Add unit tests for short header, truncated directory, missing channel, truncated base calls, and truncated quality blocks.
2. **Sequence-record foundation**
   - Add `SequenceRecord` types and deterministic normalization utilities.
   - Add FASTA parser/writer for single and multi-line records, including clear non-goal handling for featureless FASTA.
3. **GenBank parser/writer**
   - Parse LOCUS, DEFINITION, ACCESSION/VERSION when present, FEATURES, ORIGIN, topology, and qualifiers.
   - Write deterministic GenBank and re-import to the same normalized model.
4. **SnapGene `.dna` parser**
   - Parse public fixture blocks required for sequence, topology, features, primers, notes, and display metadata.
   - Preserve unknown block payloads in `rawMetadata` when needed for later writer support.
5. **Round-trip gate**
   - Add the Addgene `.dna` -> GenBank -> re-import zero-loss test and manifest.
   - Add a fixture-update script or documented command that verifies checksums without network access.
6. **UX integration**
   - Route record imports through a worker.
   - Add design-system-consistent loading/error/empty states for sequence records and include them in the screenshot UX gallery.
7. **Devlog and release evidence**
   - Update the devlog for each small PR with commands, screenshot gate status, and any fixture provenance changes.

## Acceptance evidence checklist for the implementation wave

- [ ] `.dna` Addgene fixture imports as a `SequenceRecord` with expected sequence, topology, features, primers, and notes.
- [ ] GenBank export from that record re-imports with zero feature/primer/note loss.
- [ ] FASTA import/export remains deterministic and explicitly documents featureless limitations.
- [ ] >=100 real ABI fixtures across >=3 instrument models parse with expected base calls and qualities.
- [ ] Truncated/corrupt AB1 and SCF files return domain-specific errors through the worker and never crash the app.
- [ ] Parser work stays client-side, TypeScript-only, worker-backed, and uses typed arrays for trace data.
- [ ] Full validation passes: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, plus E2E/UX/perf gates when UI or fixture coverage changes.

## Source index

- Current format dispatch: `/home/runner/work/sanger-viewer/sanger-viewer/src/parsers/index.ts`
- ABIF parser: `/home/runner/work/sanger-viewer/sanger-viewer/src/parsers/abif.ts`
- SCF parser: `/home/runner/work/sanger-viewer/sanger-viewer/src/parsers/scf.ts`
- Worker parser boundary: `/home/runner/work/sanger-viewer/sanger-viewer/src/workers/parser.worker.ts`
- Reference-record context spec: `/home/runner/work/sanger-viewer/sanger-viewer/docs/specs/04-reference-record-context.md`
- Fixture provenance: `/home/runner/work/sanger-viewer/sanger-viewer/fixtures/PROVENANCE.md`
- Existing competitor-grounded feature research: `/home/runner/work/sanger-viewer/sanger-viewer/docs/research/next-killer-features.md`
- SnapGene product surface: https://www.snapgene.com/features
- Benchling platform surface: https://www.benchling.com/
- Chromas product surface: https://technelysium.com.au/wp/chromas/
- ApE product surface: https://jorgensen.biology.utah.edu/wayned/ape/
- Addgene sequence-analysis workflow context: https://www.addgene.org/protocols/sequence-analysis/
