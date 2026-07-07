# Free trace-to-reference alignment with synced chromatogram — implementation plan

Date: 2026-07-07  
Owner: @animeshkundu / cloud-agent work unit planning  
Unit marker: be5f38f6-cf63-4ebd-a43f-174797af0ffd

## Goal

Deliver a small, independently shippable PR that makes trace-to-reference review feel like a best-in-class, free, private alternative to paid desktop workflows: align a Sanger read or forward+reverse pair to a <=10KB plasmid reference client-side in <50ms, render mismatch/indel/ambiguous/low-quality evidence, and let every finding jump the chromatogram to the corresponding base.

## Files expected to change

### Core alignment and data model

- `/home/runner/work/sanger-viewer/sanger-viewer/src/alignment/aligner.ts`
  - Keep existing public compatibility where possible.
  - Add or delegate to a plasmid-scale seed/window + banded-refine implementation.
- `/home/runner/work/sanger-viewer/sanger-viewer/src/alignment/cigar.ts`
  - Add/verify coordinate helpers for deletion-nearest evidence and consensus-to-read projection if needed.
- `/home/runner/work/sanger-viewer/sanger-viewer/src/types/alignment.ts`
  - Extend models for alignment diagnostics, consensus evidence, low-quality/ambiguous regions, and reference-length validation if needed.
- New likely file: `/home/runner/work/sanger-viewer/sanger-viewer/src/alignment/plasmidAligner.ts`
  - Pure TypeScript algorithm; no DOM; no WASM.
- New likely file: `/home/runner/work/sanger-viewer/sanger-viewer/src/workers/alignment.worker.ts`
  - Worker wrapper around the pure aligner.

### UI and state integration

- `/home/runner/work/sanger-viewer/sanger-viewer/src/components/ReferencePanel.ts`
  - Add clear async states, reference length feedback, and paired-read/consensus alignment affordance if it fits the existing panel.
- New likely file: `/home/runner/work/sanger-viewer/sanger-viewer/src/components/AlignmentReviewPanel.ts`
  - Render synchronized reference/read/consensus rows with mismatch/indel/ambiguous/low-quality markers.
- `/home/runner/work/sanger-viewer/sanger-viewer/src/components/TraceViewer.ts`
  - Replace synchronous alignment call with worker-backed request handling.
  - Wire alignment finding selection to `ChromatogramCanvas.focusBaseRange()`.
  - Persist/restore alignment state per workspace slot without breaking existing panels.
- `/home/runner/work/sanger-viewer/sanger-viewer/src/components/VariantTable.ts`
  - Preserve current variant review/export behavior; optionally add clearer selected-row state for navigation.
- `/home/runner/work/sanger-viewer/sanger-viewer/src/style.css`
  - Reuse existing reference/variant/quality/contig tokens; add minimal new tokens only for alignment review markers.

### Tests and fixtures

- `/home/runner/work/sanger-viewer/sanger-viewer/tests/core/alignment.test.ts`
  - Add known-construct correctness tests for embedded plasmid placement, SNV, insertion, deletion, reverse strand, invalid/too-long reference, and ambiguity/low-quality classification.
- New likely file: `/home/runner/work/sanger-viewer/sanger-viewer/tests/core/referenceConsensusAlignment.test.ts`
  - Verify forward+reverse merge creates one consensus alignment and preserves evidence mapping.
- `/home/runner/work/sanger-viewer/sanger-viewer/tests/core/perf-harness.test.ts` or new focused perf test
  - Add a deterministic <=10KB reference + Sanger-read budget test asserting <50ms for algorithmic alignment.
- `/home/runner/work/sanger-viewer/sanger-viewer/tests/e2e/reference-alignment.e2e.test.ts`
  - Add mismatch click/keyboard navigation assertions and worker loading/error states.
- New or extended E2E test near `/home/runner/work/sanger-viewer/sanger-viewer/tests/e2e/contig.e2e.test.ts`
  - Verify fwd/rev merge-to-consensus alignment path.
- `/home/runner/work/sanger-viewer/sanger-viewer/tests/e2e/ux-gallery.e2e.test.ts`
  - Add alignment-review state captures if the PR changes visible UX.

### Documentation/devlog

- New devlog folder: `/home/runner/work/sanger-viewer/sanger-viewer/blog/2026-07-07-free-trace-reference-alignment/`
- `/home/runner/work/sanger-viewer/sanger-viewer/blog/index.html`
  - Add the devlog entry.
- `/home/runner/work/sanger-viewer/sanger-viewer/vite.config.ts`
  - Add the devlog HTML entry so Vite emits it.
- `/home/runner/work/sanger-viewer/sanger-viewer/docs/specs/07-reference-alignment.md`
  - Update status/outcome if behavior changes materially.
- `/home/runner/work/sanger-viewer/sanger-viewer/LEARNINGS.md` if present or newly warranted
  - Record durable alignment/perf lessons only if implementation uncovers non-obvious constraints.

## Step-by-step implementation plan

1. **Baseline and guardrails**
   - Run `npm ci` if dependencies are absent.
   - Run and capture initial `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run ux:gallery` as practical baseline checks.
   - If baseline has unrelated failures, document them verbatim before changes.

2. **Add failing core correctness tests first**
   - Add known-construct unit tests that currently fail for a read embedded far from reference start.
   - Include exact expected coordinates, strand, CIGAR/variant category expectations, insertion/deletion cases, and invalid reference length >10KB.
   - Add a forward+reverse consensus alignment test that fails until consensus alignment exists.

3. **Build the pure plasmid-scale alignment core**
   - Normalize input bases and reject references over 10KB with a user-facing error.
   - Encode bases into compact typed arrays inside the core or worker boundary.
   - Use k-mer seed placement to locate candidate windows on forward and reverse-complement strands.
   - Refine top candidates with banded semi-global DP and deterministic tie-breaking.
   - Return alignment placement, CIGAR, mismatches, insertions, deletions, ambiguity flags, low-quality regions, elapsed diagnostics, and evidence mappings.

4. **Add the alignment worker**
   - Follow the parser worker import pattern.
   - Use request IDs so stale worker responses cannot overwrite newer alignment state.
   - Surface loading, success, invalid input, and worker failure states in `ReferencePanel`.
   - Keep a synchronous pure-core API for unit/perf tests.

5. **Integrate single-read UI without regressing existing variant table**
   - Update `TraceViewer.runAlignment()` to call the worker.
   - Preserve existing `callVariants()` and export behavior unless model changes require a small adapter.
   - Add alignment-review rendering next to the existing Reference/Variant panels in the Analyze sidebar.
   - Ensure mismatch/indel rows and markers are buttons or keyboard-operable rows with clear accessible names.

6. **Add chromatogram-synced navigation**
   - Centralize variant/finding-to-read-index mapping, including reverse-strand and deletion-only nearest evidence.
   - On click/Enter/Space, select the finding, focus the chromatogram base, update readout, and preserve visible selected state.
   - Add E2E assertions using `[data-testid="chromatogram-canvas"]` and viewport/readout changes.

7. **Add forward+reverse merge alignment**
   - Reuse existing workspace resident slots and contig/consensus primitives.
   - When exactly two traces are loaded, expose a clearly labeled “Align merged consensus” action or mode.
   - Produce one consensus alignment with support metadata from both reads.
   - Keep the existing ContigPanel and Export Consensus FASTA behavior working.

8. **Flag ambiguous and low-quality regions**
   - Reuse mixed-base/quality confidence concepts and existing visual tokens.
   - Mark ambiguous and low-quality aligned positions with non-color-only glyphs/text and accessible labels.
   - Add unit tests for classification and E2E checks that flags appear for low-quality fixture/reference scenarios.

9. **Polish UX within existing design system**
   - Apply existing spacing, typography, radius, color, focus, and motion tokens.
   - Respect reduced-motion settings.
   - Verify light/dark and narrow-mobile behavior; avoid new one-off panel styling.

10. **Screenshot gate and devlog**
    - Extend UX gallery captures for alignment review, selected mismatch, worker loading, and invalid reference error if feasible in this focused PR.
    - Write a short devlog entry with what changed, UX quality review, performance result, and follow-ups.
    - Add the new devlog page to `blog/index.html` and `vite.config.ts`.

11. **Final validation and PR readiness**
    - Run `npm run lint && npm run typecheck && npm run test`.
    - Run `npm run build`.
    - Run `npm run test:e2e`.
    - Run `npm run perf:smoke` and the new alignment perf test.
    - Run `npm run ux:gallery` and review generated screenshots.
    - Run secret scanning on changed files before committing.
    - Run `parallel_validation` after committing implementation changes.

## Acceptance-criteria verification map

1. **Competitor-benchmarked**
   - Verify the PR references existing competitor/design/perf research and, if scoped in, updates a refreshed competitor-gap artifact.
   - For this implementation PR, explicitly connect the feature to the SnapGene-paywalled trace-to-reference workflow in devlog/PR notes.

2. **Frictionless first run**
   - Verify existing zero-config sample/empty/loading/error states still pass `front-door-polish`, UX gallery, and relevant E2E tests.
   - Confirm alignment errors do not break first-run sample loading.

3. **Cohesive design system**
   - Verify styles use tokens from `src/style.css` and match light/dark panels.
   - Use screenshot gallery review to check no fragmented/broken panel feel.

4. **Delight**
   - Verify worker-backed feedback, selected marker state, and jump-to-evidence transitions feel responsive and respect reduced motion.
   - Screenshot review should include “is this great UX / what to improve”.

5. **Accessibility**
   - Verify all new controls have roles/names, status updates use live regions, row selection works by keyboard, focus is visible, and narrow-mobile/touch remains operable.
   - Add E2E assertions for keyboard mismatch navigation.

6. **Performance**
   - Unit/perf test asserts plasmid-scale alignment core under 50ms for <=10KB reference.
   - Existing pan/zoom E2E perf and `perf:smoke` remain green.
   - Worker integration prevents alignment from blocking canvas interaction.

7. **Power preserved**
   - Existing tests for editing, export, alignment, assembly, primer/Tm, permalinks, multi-trace, and workspace behavior remain green.
   - Manual smoke through Analyze/Inspect/Map/Share panels after implementation.

8. **Per-PR gates**
   - Full CI-equivalent commands run with verbatim output.
   - UX gallery screenshots generated and reviewed.
   - Devlog updated.
   - No skipped/stubbed/TODO-only implementation.
   - Controller marker included in branch, first commit trailer, and eventual PR body.

## Key risks and mitigations

- **Algorithm correctness:** mitigate with exact known-construct tests and deterministic tie-breaking.
- **Main-thread jank:** mitigate with worker offload and stale-response cancellation.
- **Coordinate drift:** mitigate with shared mapping helpers and reverse/indel/deletion tests.
- **Scope creep:** keep batch reporting and full competitor-gap rewrite separate unless explicitly approved.
- **UX fragmentation:** reuse existing components/tokens and review screenshots before handoff.

## Proposed first implementation commit trailer

The first implementation/planning commit should include this trailer exactly:

`Unit-ID: be5f38f6-cf63-4ebd-a43f-174797af0ffd`
