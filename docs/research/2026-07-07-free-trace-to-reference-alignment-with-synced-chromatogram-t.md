# Free trace-to-reference alignment with synced chromatogram — research notes

Date: 2026-07-07  
Owner: @animeshkundu / cloud-agent work unit planning  
Unit marker: be5f38f6-cf63-4ebd-a43f-174797af0ffd

## Context

This work unit targets the SnapGene-paywalled workflow: align one or two Sanger reads to a plasmid-scale reference, surface mismatches and indels, and keep the chromatogram synchronized with the alignment evidence. The implementation must stay client-side, use TypeScript + Web Workers + typed arrays, and avoid WASM.

Relevant existing repo evidence:

- Existing reference-alignment spec: `/home/runner/work/sanger-viewer/sanger-viewer/docs/specs/07-reference-alignment.md`
- Current synchronous banded aligner: `/home/runner/work/sanger-viewer/sanger-viewer/src/alignment/aligner.ts`
- Current variant calling and clickable jump path: `/home/runner/work/sanger-viewer/sanger-viewer/src/variants/caller.ts`, `/home/runner/work/sanger-viewer/sanger-viewer/src/components/VariantTable.ts`, `/home/runner/work/sanger-viewer/sanger-viewer/src/components/TraceViewer.ts`
- Existing parser worker pattern: `/home/runner/work/sanger-viewer/sanger-viewer/src/workers/parser.worker.ts`
- Existing paired-read contig/consensus building blocks: `/home/runner/work/sanger-viewer/sanger-viewer/src/consensus/contig.ts`, `/home/runner/work/sanger-viewer/sanger-viewer/src/consensus/assemblyControls.ts`
- Existing performance gates: `/home/runner/work/sanger-viewer/sanger-viewer/tests/core/perf-harness.test.ts`, `/home/runner/work/sanger-viewer/sanger-viewer/tests/e2e/perf.e2e.test.ts`
- Existing UX screenshot gate: `/home/runner/work/sanger-viewer/sanger-viewer/tests/e2e/ux-gallery.e2e.test.ts`
- Existing devlog convention: `/home/runner/work/sanger-viewer/sanger-viewer/blog/index.html` plus one folder per shipped slice.

## Current-state findings

### Alignment capability already exists but is not enough for this work unit

Current `alignReadToReference()` implements a synchronous banded semi-global Needleman-Wunsch alignment and returns placement, CIGAR, mismatches, insertions, and deletions. It currently runs on the main thread from `TraceViewer.runAlignment()`, then `callVariants()` powers the `VariantTable`.

Important gap: the current band window follows the main diagonal (`j ≈ i`), which is not suitable for finding a read anywhere inside a <=10KB plasmid reference unless the read starts near reference position 0. The target workflow needs plasmid-scale placement, so the implementation should add a fast seed/window placement stage before banded refinement.

### Chromatogram jump path already exists

Variant rows dispatch `variant-select`; `TraceViewer` looks up the selected variant and calls `renderer.focusBaseRange(variant.readIndex, variant.readIndex)`. This is the right integration point for mismatch navigation, but the alignment UI should make mismatch/indel rows explicit, preserve focus/selection state, and ensure deletion-only variants have a deterministic nearest evidence jump.

### Forward + reverse merge can build on existing contig primitives

The repo already has a paired-read assembly surface and `PairedContig` model. The work unit should not fragment this functionality. It should either reuse `assembleWithControls()`/`buildPairedContig()` or extract a smaller pure function that produces a reference-alignment subject from exactly two resident traces. The new alignment panel should make the merged-consensus alignment explicit without breaking the existing manual assembly panel.

### Low-quality and ambiguous visual language exists

Current features already use mixed-base ambiguity highlights, a quality track, low-quality fixture tests, and variant confidence levels. The alignment feature should reuse this language rather than inventing new colors. The missing piece is an aligned reference/read/consensus strip that marks mismatches, insertions, deletions, ambiguous bases, and low-quality windows with non-color-only markers.

### Worker precedent exists only for parsing

`parser.worker.ts` demonstrates Vite `?worker` loading and transferable buffers. Alignment should follow this pattern with a new alignment worker and cancellable request IDs. Since strings are copied, the pure alignment core should convert bases/qualities to compact typed arrays inside the worker and return compact result data.

## Competitor benchmark grounding

Existing research (`docs/research/next-killer-features.md`) cites SnapGene, Benchling, Chromas, FinchTV/4Peaks-adjacent desktop tools, ApE-like plasmid workflows, and adjacent Sanger tools. This unit specifically addresses the competitor gap where desktop/proprietary tools offer reference alignment and trace-linked review, while the web app can differentiate with private, zero-install, browser-native alignment.

Current app position for this unit:

| Area | Current state | Target state for this unit |
|---|---|---|
| SnapGene-like trace-to-reference review | Basic reference alignment + variant table exists | Free, private, plasmid-scale <=10KB alignment in <50ms off-main-thread |
| Chromatogram synchronization | Variant rows can jump to a read index | Every mismatch/indel/low-quality region is clickable and keyboard-operable |
| Fwd/rev evidence | Separate consensus/contig features exist | One reference-aligned consensus view from forward + reverse reads |
| Ambiguous/low-quality interpretation | Quality/mixed-base UI exists | Alignment view flags ambiguity/low-quality regions next to reference context |
| UX proof | Existing UX gallery captures broad app states | Add alignment-focused screenshot states and written UX-quality review |

## Recommended technical approach

1. Add a pure alignment-planning layer that normalizes DNA strings, validates reference length <=10KB, and converts sequences to compact 2-bit/4-bit typed arrays.
2. Add a seed-and-refine aligner for plasmid scale:
   - Seed candidate placements with k-mer anchors from the read against the reference.
   - Score a bounded set of candidate windows on both strands.
   - Run banded semi-global dynamic programming only around candidate windows.
   - Return deterministic placement, CIGAR, score, diagnostics, and confidence/ambiguity flags.
3. Run alignment in a Web Worker and keep the main thread responsive with request IDs and loading/error/success states.
4. Add a reference-alignment review component that renders reference/read/consensus rows and variant markers while reusing design tokens and existing variant review behavior.
5. Extend paired-read support by generating a consensus subject from the existing contig/consensus code path, then aligning that subject to the reference.
6. Add tests first for known constructs, mismatch navigation, fwd/rev merge, reference length validation, ambiguity/low-quality flags, and the <50ms alignment budget.
7. Update screenshot gallery and devlog with alignment states and explicit UX review.

## Key risks

- **Current aligner placement risk:** existing diagonal-banded DP may fail for reads embedded far from reference start. Mitigation: seed/window pre-placement before DP refinement.
- **Performance flakiness risk:** <50ms must be measured for algorithmic core in Vitest and not include Playwright/UI overhead. Mitigation: median or repeated deterministic checks with a realistic 10KB reference and Sanger-scale read.
- **Coordinate mapping risk:** reverse-strand, insertions, deletions, and consensus coordinates can drift from chromatogram base indices. Mitigation: centralize mapping helpers and assert exact read/ref/evidence coordinates.
- **Feature regression risk:** TraceViewer already owns many panels and state transitions. Mitigation: isolate the new UI component and keep existing variant table/export behavior intact.
- **UX fragmentation risk:** alignment-specific UI could introduce one-off colors/styles. Mitigation: add tokens only if needed and otherwise reuse reference/variant/quality/contig token families.
- **Worker serialization risk:** large object copies can erase performance wins. Mitigation: keep worker messages small and transfer typed arrays when practical.

## Backlog grounded by this research

Priority order for the implementation PR:

1. Correct plasmid-scale placement core with known-construct tests.
2. Worker integration and <50ms core performance test.
3. Alignment review UI with clickable/keyboard-operable mismatch/indel navigation.
4. Forward+reverse consensus alignment using existing contig/consensus primitives.
5. Ambiguous/low-quality visual flags in the alignment view.
6. UX gallery + devlog update.
7. Full regression validation across lint, typecheck, unit, E2E, perf smoke, build, and UX gallery.

## Follow-ups outside this work unit

- Full competitor-gap refresh replacing stalled PR #46 should remain a separate, focused documentation PR unless this unit is explicitly expanded.
- Circular plasmid origin-spanning placement is important and already noted in the reference-alignment spec, but should only be included here if it does not threaten the small-PR scope.
- Batch clone-screen pass/fail reporting belongs in a later PR after this alignment substrate is stable.
