# Implementation plan: sequence-file interop hardening

Date: 2026-07-07

Controller correlation marker: `39357c52-47fd-4b6f-9abc-58c8770da576`

## Goal

Deliver robust client-side import/export for SnapGene `.dna`, GenBank, and FASTA while hardening AB1/SCF parsing against malformed files. Preserve features, primers, and notes across the SnapGene-to-GenBank round trip without regressing existing trace viewer features.

## Files expected to change

### New source files

- `src/types/sequenceRecord.ts`
  - Add the canonical model for imported/exported sequence records.
- `src/parsers/errors.ts`
  - Add typed parse errors and bounds-check helpers used by binary/text parsers.
- `src/parsers/fasta.ts`
  - Add FASTA import/export for sequence records.
- `src/parsers/genbank.ts`
  - Add GenBank import/export preserving features, primers, notes, topology, and unknown qualifiers.
- `src/parsers/snapgene.ts`
  - Add SnapGene `.dna` binary parser for the fixture-backed supported subset.
- `src/export/genbank.ts`
  - Add GenBank serializer if not colocated with `src/parsers/genbank.ts`.

### Existing source files

- `src/parsers/index.ts`
  - Extend format detection and expose trace-vs-sequence-record parse entry points without breaking existing `parseTrace` callers.
- `src/parsers/abif.ts`
  - Replace unchecked `DataView` reads/slices with bounds-checked helpers and format-specific parse errors.
- `src/parsers/scf.ts`
  - Add header/table/sample/base bounds validation and format-specific parse errors.
- `src/workers/parser.worker.ts`
  - Extend worker messages so parsing stays off-main-thread and can return either a trace or sequence record.
- `src/components/TraceViewer.ts`
  - Widen accepted file extensions, route sequence-record imports, and surface graceful success/error states using existing banners/components.
- `src/components/ReferencePanel.ts`
  - If needed, accept loaded sequence-record FASTA/GenBank content as reference context without duplicating parsing logic.
- `src/export/fasta.ts`
  - Add record-aware FASTA export or delegate to `src/parsers/fasta.ts` while preserving trace FASTA behavior.
- `src/annotations/types.ts`
  - Add imported feature compatibility only if existing generated annotation types cannot represent imported records safely.
- `src/types/primer.ts`
  - Add imported primer metadata only if it cannot live cleanly in `SequenceRecord`.

### Test and fixture files

- `tests/parsers/corrupt-traces.test.ts`
  - Add truncated/corrupt AB1/SCF tests that would currently throw raw range errors or crash paths.
- `tests/parsers/fasta.test.ts`
  - Add FASTA import/export tests including multi-record and metadata edge cases.
- `tests/parsers/genbank.test.ts`
  - Add GenBank parser/serializer round-trip tests for features, primers, notes, topology, joins/complements, and unknown qualifiers.
- `tests/parsers/snapgene.test.ts`
  - Add fixture-backed `.dna` parse tests and `.dna -> GenBank -> re-import` zero-loss assertions.
- `tests/parsers/abi-corpus.test.ts`
  - Add `>=100` real ABI file corpus coverage with `>=3` model assertion once fixture provenance is resolved.
- `tests/e2e/interop-import.e2e.test.ts`
  - Add browser import/error-state coverage for `.dna`, `.gb/.gbk`, `.fa/.fasta`, and corrupt `.ab1`.
- `fixtures/sequence/PROVENANCE.md`
  - Document provenance/license/checksums for Addgene `.dna`, GenBank, FASTA, and any derived expected snapshots.
- `fixtures/abi-corpus/PROVENANCE.md`
  - Document provenance/license/model metadata for the real ABI corpus.

### Documentation and UX gate files

- `docs/research/2026-07-07-sequence-file-interop-hardening-the-1-snapgene-migration-blo.md`
  - Keep updated if implementation discoveries change the research assumptions.
- `docs/plans/2026-07-07-sequence-file-interop-hardening-the-1-snapgene-migration-blo.md`
  - Keep updated if scope is split across multiple PRs.
- `fixtures/PROVENANCE.md`
  - Link to new fixture provenance files if new fixture directories are added.
- `LEARNINGS.md`
  - Update only if the repo already contains it or if durable parser/format lessons need to be preserved.
- `blog/index.html`
  - Add the implementation devlog entry.
- `blog/2026-07-07-sequence-file-interop-hardening/index.html`
  - Add the implementation devlog entry.
- `vite.config.ts`
  - Add the new devlog HTML entry to Rollup inputs so it is emitted in the built site.
- `tests/e2e/ux-gallery.e2e.test.ts`
  - Add interop/error states to the screenshot gate if the UI adds visible states not covered by current gallery captures.

## Step-by-step implementation plan

1. Establish exact fixture/legal strategy before parser work.
   - Identify a real Addgene `.dna` file with redistribution-safe terms or obtain explicit permission.
   - Identify `>=100` real ABI files across `>=3` instrument models with redistribution-safe provenance.
   - If either dataset cannot be committed, stop and report the blocker instead of substituting synthetic fixtures for acceptance criteria that require real files.

2. Add the canonical `SequenceRecord` model.
   - Represent sequence string, circular/linear topology, source format, features, primers, notes/comments, and raw qualifiers.
   - Preserve unknown GenBank/SnapGene qualifiers verbatim so exports do not silently lose data.
   - Keep this separate from `TraceData` to preserve all existing trace workflows.

3. Add parser error infrastructure.
   - Add `ParseError`/`UnsupportedFormatError` style errors with user-safe messages and optional internal context for tests.
   - Add helper functions for checked DataView reads, byte slicing, ASCII decoding, and range validation.

4. Harden AB1 parsing.
   - Validate minimum header size before reading.
   - Validate root directory entry location, entry count, per-entry data ranges, element sizes, channel arrays, base calls, peak positions, and quality lengths.
   - Convert raw `RangeError`/out-of-bounds failures into graceful parse errors.
   - Preserve current successful output for all existing AB1 fixtures.

5. Harden SCF parsing.
   - Validate header size, version parse, sample size, sample table range, base table range, and base count before reading.
   - Convert malformed/truncated data into graceful parse errors.
   - Preserve current successful output for existing SCF fixture(s).

6. Implement FASTA record parsing/export.
   - Support single and multi-record FASTA.
   - Preserve record IDs/descriptions where possible.
   - Treat FASTA as sequence-only; explicitly record that features/primers/notes are absent rather than lost.

7. Implement GenBank parsing/export.
   - Parse LOCUS, DEFINITION, ACCESSION/VERSION where present, COMMENT/structured notes, FEATURES, qualifiers, source topology, and ORIGIN sequence.
   - Preserve joins/complements/ranges in feature location strings until a robust structured location model is warranted.
   - Serialize deterministic GenBank output and re-import it losslessly for the supported model.

8. Implement SnapGene `.dna` parser for the fixture-backed supported subset.
   - Detect `.dna` by extension and binary signature/structure, not extension alone.
   - Parse sequence, topology, features, primers, and notes from the real Addgene fixture.
   - Preserve unsupported SnapGene blocks as raw metadata if needed to avoid silent loss.
   - Fail gracefully with a clear unsupported-version/unsupported-block message for unsupported variants.

9. Extend parser entry points and worker protocol.
   - Keep `parseTrace(buffer, fileName): TraceData` backward compatible.
   - Add `parseSequenceRecord(bufferOrText, fileName)` or `parseFile(buffer, fileName)` returning a discriminated union.
   - Update worker messages to return `{ kind: 'trace', trace }` or `{ kind: 'sequence-record', record }`.
   - Continue transferring trace channel typed arrays.

10. Integrate UI with minimal design-system churn.
    - Widen file inputs to accept `.ab1,.scf,.dna,.gb,.gbk,.genbank,.fa,.fasta`.
    - Reuse existing loading/success/error banners for import status.
    - Add a concise sequence-record summary state/panel only if necessary for users to verify imported features/primers/notes.
    - Ensure keyboard, touch, focus, ARIA, and dark/light states reuse existing tokens and components.

11. Add tests that fail before the change.
    - Corrupt/truncated AB1 and SCF tests.
    - FASTA parser/export tests.
    - GenBank parser/export tests with features, primers, notes, and unknown qualifiers.
    - SnapGene Addgene `.dna -> GenBank -> re-import` zero-loss test.
    - ABI corpus exact base/quality/model coverage test.
    - E2E import/error-state tests.

12. Preserve existing power features.
    - Run existing unit tests for editing, exports, alignment, assembly, primer/Tm, permalinks, multi-trace, clone-screen, and rendering.
    - Avoid rewriting shared `TraceData` semantics.
    - Add compatibility tests only where new sequence-record logic touches existing panels.

13. Update documentation and devlog.
    - Update fixture provenance.
    - Update `LEARNINGS.md` if parser-format lessons are durable and useful.
    - Add devlog entry and `vite.config.ts` input.
    - Update UX gallery states or written UX review for any new user-visible import states.

14. Validate and prepare PR.
    - Run `npm run lint`.
    - Run `npm run typecheck`.
    - Run `npm run test`.
    - Run `npm run build`.
    - Run `npm run test:e2e`.
    - Run `npm run perf:smoke`.
    - Run `npm run ux:gallery`.
    - Paste actual verbatim output in the handoff/PR body.
    - Run secret scanning on changed files before committing.
    - Run final code/security validation before completion.

## Acceptance-criteria verification map

1. COMPETITOR-BENCHMARKED
   - Verify the implementation remains grounded in the refreshed research artifact and update it with any fixture/parser discoveries.
   - Add PR body section linking the research and screenshot UX review.

2. FRICTIONLESS FIRST RUN
   - Verify existing AB1/SCF open-to-render remains instant and private.
   - Verify `.dna`, GenBank, and FASTA imports show clear loading/success/error states.
   - Verify sample data remains one-click and unchanged.

3. COHESIVE DESIGN SYSTEM
   - Verify new import/status UI uses existing tokens, banners, controls, and panels.
   - Capture light/dark screenshots for new states if user-visible UI changes are added.

4. DELIGHT
   - Verify import feedback is responsive and purposeful.
   - Respect reduced-motion behavior already exercised by the UX gallery.

5. ACCESSIBILITY
   - Verify keyboard file loading path, focus management after import/error, ARIA status/alert announcements, contrast, and narrow-mobile/touch behavior.
   - Add E2E assertions for any new interactive UI.

6. PERFORMANCE
   - Verify parsing remains off-main-thread.
   - Run `npm run perf:smoke` and existing performance harness tests.
   - For the `>=100` ABI corpus, ensure the test checks correctness without introducing excessive CI runtime.

7. POWER PRESERVED
   - Run the full unit/E2E suite and specifically note editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace coverage.
   - Do not remove or weaken existing tests.

8. Every PR gate
   - CI-equivalent local commands must pass with verbatim output.
   - Screenshot gate must include all key UX states and written “is this great UX / what to improve” review.
   - Devlog must be updated.
   - The PR body must include the controller marker on its own line:

```text
39357c52-47fd-4b6f-9abc-58c8770da576
```

## Key risks

- Real Addgene `.dna` fixture redistribution may be blocked.
- SnapGene `.dna` binary variants may exceed a single small PR; unsupported variants need explicit graceful errors.
- `>=100` real ABI files may bloat the repository or slow CI if not curated carefully.
- GenBank feature syntax is broad; preserving raw location/qualifier strings is safer than over-normalizing too early.
- UI integration can accidentally conflate trace and sequence-record workflows; keep models and states explicitly separated.
