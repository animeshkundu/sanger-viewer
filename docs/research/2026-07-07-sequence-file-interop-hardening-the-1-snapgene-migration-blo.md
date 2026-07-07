# Sequence-file interop hardening: SnapGene migration blocker research

Date: 2026-07-07

Controller correlation marker: `39357c52-47fd-4b6f-9abc-58c8770da576`

## Scope

This research grounds a focused implementation wave for robust sequence-file interoperability:

- Import/export SnapGene `.dna`, GenBank, and FASTA.
- Preserve features, primers, and notes across `.dna -> GenBank -> re-import` round-trips.
- Harden existing AB1/SCF trace parsing so corrupt/truncated files produce graceful user-facing errors, not crashes.
- Keep all parsing client-side and off the main thread where file size or binary parsing can affect responsiveness.
- Avoid WASM.

## Repository current state

### Existing parser and worker architecture

- Trace parsing is centralized in `src/parsers/index.ts`, which currently detects only ABIF (`ABIF`) and SCF (`.scf`) headers and throws for all other formats.
- AB1 parsing lives in `src/parsers/abif.ts`; it reads ABIF directory entries and returns `TraceData` with channels, base calls, peak positions, optional qualities, and metadata.
- SCF parsing lives in `src/parsers/scf.ts`; it reads SCF v2/v3-like sample and base tables and returns the same `TraceData` shape.
- Browser parsing already runs through `src/workers/parser.worker.ts`, transferring the input buffer to the worker and channel typed-array buffers back to the main thread.
- The UI file input in `src/components/TraceViewer.ts` currently accepts only `.ab1,.scf` and error text is surfaced through a status banner.

### Existing sequence/reference/export architecture

- FASTA export exists in `src/export/fasta.ts` but is trace-centric and does not represent annotated reference records, feature tables, primers, or notes.
- Reference FASTA loading exists in `src/components/ReferencePanel.ts` and sequence cleanup exists in `src/alignment/aligner.ts`, but the parser only returns a single `{ name, sequence }` result and does not preserve annotations.
- App-level annotation types in `src/annotations/types.ts` currently model generated ORF and restriction-site overlays, not imported GenBank/SnapGene feature records.
- Primer types in `src/types/primer.ts` model computed/user-entered primer pairs, but there is no imported sequence-record primer model or round-trip serializer.

### Existing fixtures and coverage

- Parser tests currently cover a small set of real and synthetic trace fixtures in `fixtures/ab1`, `fixtures/scf`, and `fixtures/large` through `tests/parsers/*.test.ts`.
- `fixtures/PROVENANCE.md` documents real fixtures from Biopython and CutePeaks plus deterministic synthetic ABIF files.
- Current real AB1 model coverage appears to include ABI PRISM 310, 3100, and 3730 fixture names/metadata, but the suite is far below the requested `>=100` real ABI files.
- `tests/parsers/sample.test.ts` asserts exact base calls for `public/sample.ab1`, including 868 calls and known base positions.
- E2E UX-gallery capture exists in `tests/e2e/ux-gallery.e2e.test.ts` and is run locally by `npm run ux:gallery`; it captures key UI states across light/dark and responsive viewports.

## Competitor benchmark findings for this work unit

| Tool | Interop strengths relevant to this work | Migration lesson for sanger-viewer |
|---|---|---|
| SnapGene / SnapGene Viewer | Public feature list highlights conversion across many file formats including GenBank/DDBJ and ApE, feature/annotation editing, primer tools, reference alignment, contig assembly, history, sharing, and batch operations. SnapGene Viewer mode can view plasmid maps, annotate features, and share sequences for free. | `.dna`/GenBank fidelity is table-stakes for users migrating plasmid verification workflows. Losing feature names, primer annotations, or notes during conversion breaks trust immediately. |
| Benchling | Public home page positions Benchling around structured experimental data and wet-lab execution in a single loop. | Users expect sequence records to preserve structured context, not just raw bases. Local-private import/export can differentiate if it round-trips structured records without cloud lock-in. |
| Chromas | Public page says Chromas opens AB1/SCF/ZTR, saves SCF/AB1, exports sequence as FASTA/FASTQ/EMBL/GenBank/GCG, supports reverse complement, search, printing, batch processing, and quality/vector trimming. | Trace import/export robustness and broad text export are mature incumbent expectations. sanger-viewer should match AB1/SCF gracefulness while exceeding with browser privacy and annotation-preserving GenBank/SnapGene migration. |
| FinchTV | Public landing page was reachable but content exposed to the fetch tool was minimal. FinchTV remains commonly referenced as a Sanger chromatogram viewer for opening ABI/SCF traces, zooming/inspecting peaks, copying/exporting sequence, and quality review. | FinchTV-like simplicity is the baseline: open a trace without setup and never crash on bad files. sanger-viewer must preserve that lightweight feel while adding modern interop. |
| ApE | Public ApE page shows ongoing maintenance and plasmid/enzyme-site workflow context. SnapGene lists ApE among supported conversion formats. | ApE users care about annotated plasmid files and enzyme/feature context; GenBank/FASTA import must not flatten records into anonymous strings. |

Sources:

- SnapGene features page: https://www.snapgene.com/features
- SnapGene Viewer page: https://www.snapgene.com/snapgene-viewer
- Benchling home page: https://www.benchling.com/
- Chromas page: https://technelysium.com.au/wp/chromas/
- FinchTV landing page: https://digitalworldbiology.com/finchtv
- ApE page: https://jorgensen.biology.utah.edu/wayned/ape/
- Existing repository research: `docs/research/next-killer-features.md`
- Existing fixture provenance: `fixtures/PROVENANCE.md`
- Existing UX gallery gate: `tests/e2e/ux-gallery.e2e.test.ts`

## Current-state UX gallery rating for the interop path

Based on existing repository structure and automated UX-gallery states, not new screenshots captured in this planning-only task:

| State | Current rating | Evidence | Gap for this work unit |
|---|---:|---|---|
| First run / sample | 4/5 | Empty state, one-click sample, private-browser copy, loading/error banners in `TraceViewer.ts`; UX gallery captures hero, empty, loading states. | Accept copy and validation for `.dna`, `.gb`, `.gbk`, `.fa`, `.fasta`; avoid implying only traces are useful. |
| Trace parse success | 4/5 | AB1/SCF render through worker and typed arrays; sample and fixture tests exist. | Bad/truncated binary bounds are not guarded consistently; real ABI corpus is too small. |
| Parse error | 3/5 | Worker catches parser exceptions and UI shows error banner. | Error messages need format-specific, non-technical, recovery-oriented detail; truncated files must be tested. |
| Structured sequence import | 1/5 | Reference FASTA textarea exists, but no app-level sequence-record import model. | Need new parser/model for FASTA/GenBank/SnapGene preserving features/primers/notes. |
| Structured sequence export | 1/5 | Trace FASTA export exists only for base sequence. | Need GenBank and FASTA serializers for imported sequence records, with round-trip tests. |
| Power preservation | 4/5 | Existing editing, export, alignment, assembly, primer, permalink, multi-trace features are represented by tests and UI. | Add interop without changing `TraceData` semantics for AB1/SCF consumers; use additive models and adapters. |

## Recommended implementation direction

1. Add a new sequence-record domain model separate from `TraceData`.
   - Keep trace parsing stable for AB1/SCF.
   - Model imported sequence records with `id`, `name`, `sequence`, `topology`, `features`, `primers`, `notes`, source format, and raw/import metadata.

2. Add pure TypeScript parsers and serializers.
   - `src/parsers/fasta.ts` for single/multi-record FASTA import and FASTA export from sequence records.
   - `src/parsers/genbank.ts` for LOCUS/DEFINITION/ACCESSION/FEATURES/ORIGIN parsing and GenBank serialization.
   - `src/parsers/snapgene.ts` for `.dna` binary detection/parsing using typed arrays and documented reverse-engineered block structure after test fixtures confirm the exact subset needed.
   - `src/export/genbank.ts` and a record-aware FASTA export path.

3. Harden AB1/SCF binary reads before broadening fixtures.
   - Introduce bounds-checked read helpers that throw typed `ParseError`s with safe messages.
   - Validate root directory offsets/counts, entry ranges, sample/base table ranges, channel lengths, peak positions, and quality lengths before reading.
   - Keep worker-level catch behavior but return clearer errors.

4. Extend the worker protocol instead of moving parsing back to the main thread.
   - Add parse request type or a new worker that can return either `TraceData` or sequence records.
   - Transfer large trace typed arrays as today; sequence-record text/binary metadata can be structured cloned.

5. Update UI affordances in a minimal, non-fragmenting way.
   - Widen file accept strings to `.ab1,.scf,.dna,.gb,.gbk,.genbank,.fa,.fasta`.
   - Add clear loaded/error states for sequence-record imports.
   - Reuse existing status banners, panels, and design tokens.

6. Fixture strategy.
   - Add a small, public Addgene `.dna` fixture with documented provenance and expected feature/primer/note snapshot if license permits committing.
   - If committing the real `.dna` is not legally safe, add a documented script/checksum workflow and a synthetic minimal `.dna` fixture for deterministic CI, while keeping the acceptance test gated on the real fixture when present.
   - Add or generate `>=100` real ABI fixtures only when provenance/licensing is documented; otherwise report the blocker explicitly rather than pretending synthetic files satisfy the criterion.

## Key risks and blockers

- SnapGene `.dna` is proprietary/binary; exact feature/primer/note block preservation may require careful fixture-led reverse engineering and may not cover every SnapGene version in one small PR.
- A real Addgene `.dna` fixture may not be redistributable. This must be resolved before committing binary test data.
- The `>=100` real ABI files across `>=3` models criterion is data-heavy; CI runtime and repository size may require fixture compression, selective corpus tests, or external artifact strategy.
- Existing app state is trace-first. Importing annotated sequence records without breaking trace tools requires an additive model, not overloading `TraceData`.
- GenBank feature qualifiers are rich and lossy if modeled too narrowly. The initial model should preserve unknown qualifiers verbatim.
- UI work must stay small and avoid reopening the design-system fragmentation problem; reuse existing shell/sidebar/status components.

## Prioritized, testable backlog for the implementation wave

1. Parser safety first: bounds-checked AB1/SCF parsing and corrupt/truncated regression tests.
2. Sequence-record model and FASTA parser/serializer with tests for multi-record handling and metadata preservation limits.
3. GenBank parser/serializer preserving feature qualifiers, primers, notes, topology, and unknown qualifiers.
4. SnapGene `.dna` parser for the Addgene fixture subset with binary block preservation where possible.
5. Round-trip Addgene `.dna -> GenBank -> re-import` snapshot test proving zero feature/primer/note loss.
6. Worker protocol extension and UI accept/error-state update.
7. ABI corpus expansion to `>=100` real files with provenance and model coverage assertion.
8. UX gallery/devlog updates and final full validation.
