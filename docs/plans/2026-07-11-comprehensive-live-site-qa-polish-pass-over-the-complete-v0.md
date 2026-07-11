# Plan: comprehensive live-site QA + polish pass over v0-v15

Date: 2026-07-11  
Owner: @animeshkundu / Copilot task agent  
Controller marker: `357fc269-385c-410e-bd0e-f6b180960f16`

## Goal

Deliver one CI-green PR containing a real Playwright-driven QA pass over the complete v0-v15 Sanger viewer feature set, concrete polish fixes for real issues found, exact-value/behavior regression tests for those fixes, and an honest human-voice devlog entry registered for Vite output.

## Step-by-step implementation plan

1. **Baseline and inventory**
   - Confirm the branch name includes the controller marker if possible; otherwise include the marker in the PR body and first implementation commit trailer.
   - Run the baseline validation commands and save verbatim output for the final handoff: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, `npm run ux:gallery`, and `npm run build`.
   - Read the current QA-related specs and fixtures to avoid duplicating weak assertions.

2. **Perform the live-site QA walkthrough with Playwright MCP**
   - Start the app with the existing Vite/Playwright server flow.
   - Load `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1` as real user files.
   - Exercise, record observations, and capture evidence for:
     - render accuracy and peak/metadata visibility;
     - zoom, pan, fit, and viewport readout changes;
     - reverse-complement view and export consistency;
     - PHRED trimming defaults, threshold behavior, and export effects;
     - IUPAC find/search, Next/Previous, Clear, and no-match states;
     - metadata and peak amplitude paths;
     - multi-trace workspace tab add/switch/close and SVG export;
     - mixed-base/heterozygote threshold behavior and ambiguity display;
     - annotation ORF/restriction lanes and click/keyboard navigation;
     - editable base calls, undo/redo, and propagation to sequence panel, FASTA, FASTQ, QUAL, and SVG;
     - per-base quality track toggle, alignment, resize, and light/dark themes;
     - keyboard-only navigation, focus visibility, ARIA names/states;
     - responsive/touch layout on tablet and narrow mobile.

3. **Classify findings**
   - Separate observations into: passes, concrete defects/friction to fix in this PR, and larger follow-ups.
   - Reject superficial findings that cannot be tested behaviorally.
   - Prefer small polish fixes in UX friction, a11y naming/state, theme tokens, responsive layout, export consistency, or deterministic redraw/resize behavior.

4. **Implement surgical polish fixes**
   - Change only the source files needed for real findings, likely in `src/components/TraceViewer.ts`, `src/components/Controls.ts`, `src/components/QualityTrack.ts`, `src/components/SequencePanel.ts`, `src/components/AnnotationTrack.ts`, `src/render/ChromatogramCanvas.ts`, or relevant export modules.
   - Preserve GitHub Pages base path support and client-only architecture.
   - Avoid retries, skipped tests, relaxed assertions, TODO-only placeholders, or broad refactors.

5. **Add genuine tests for each fix**
   - Add or strengthen Playwright E2E tests for user-visible behavior and accessibility paths.
   - Add focused unit tests for pure logic/export changes.
   - Use exact values or behavior assertions, such as accessible name/state, specific export content at edited indices, viewport attributes, computed geometry, CSS token values, downloaded SVG/FASTQ/QUAL content, or absence of horizontal overflow.
   - Do not use vacuous canvas ink-sum-only or pixel-only assertions as the sole proof of a feature.

6. **Write the devlog deliverable**
   - Create `blog/2026-07-11-comprehensive-live-site-qa-polish/index.html` in the style of existing devlog entries.
   - Include a human-voice account of what was tested, which fixtures were used, what passed, every defect/gap found, fixes shipped in the PR, validation commands, and scoped follow-ups for larger issues.
   - Add the entry to `blog/index.html`.
   - Register the page in `vite.config.ts` under `build.rollupOptions.input`.

7. **Update durable docs if warranted**
   - Update `LEARNINGS.md`, `CHANGELOG.md`, `docs/history/`, or ADRs only if the QA pass uncovers behavior/process knowledge future contributors would otherwise rediscover.
   - Do not create extra planning files unless explicitly needed.

8. **Final verification and PR readiness**
   - Run and capture verbatim output for: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, `npm run ux:gallery`, and `npm run build`.
   - Run secret scanning on all changed files before each commit.
   - Run `parallel_validation` for Copilot review and CodeQL/security feedback; address valid findings and rerun if significant code changes are made.
   - Verify every acceptance criterion one-by-one in the final handoff.
   - Use `engine-tools-report_progress` for commits/pushes and `runtime-tools-create_pull_request` only if explicitly asked to open the PR.

## Files expected to change

Required:

- `blog/2026-07-11-comprehensive-live-site-qa-polish/index.html`
- `blog/index.html`
- `vite.config.ts`
- One or more test files under `tests/e2e/` and/or `tests/core/`

Conditional based on real QA findings:

- `src/components/TraceViewer.ts`
- `src/components/Controls.ts`
- `src/components/QualityTrack.ts`
- `src/components/SequencePanel.ts`
- `src/components/AnnotationTrack.ts`
- `src/render/ChromatogramCanvas.ts`
- `src/export/fasta.ts`, `src/export/fastq.ts`, or `src/export/svg.ts`
- `src/style.css`
- `LEARNINGS.md`, `CHANGELOG.md`, or `docs/history/*.md`

## Key risks

- The existing v15 QA spec is already broad, so a new pass must produce fresh, honest evidence rather than repeating old claims.
- Playwright touch, hover, and canvas interactions can be flaky if assertions race `requestAnimationFrame` or rely on unsupported hover on touch devices.
- Export verification can be brittle unless download content is read directly and asserted structurally.
- Theme and resize issues may require deterministic media emulation and explicit canvas/DOM geometry checks.
- Full E2E plus UX gallery validation can be slow; failures must not be hidden with skips or reduced scope.
- Larger a11y gaps around canvas peak metadata may be too large for the PR; if so, scope them clearly in the devlog follow-ups.

## Acceptance-criterion verification map

- **Two real AB1 fixtures**: Playwright walkthrough and tests load `310.ab1` and `3100.ab1` from `fixtures/ab1/`.
- **Render accuracy**: assert fixture-specific loaded status, non-empty sequence/metadata, canvas data attributes, and peak metadata path; use ink only as a supporting guard.
- **Zoom/pan**: assert exact viewport attribute/readout changes after Zoom, Pan, and Fit.
- **Reverse-complement**: assert exported FASTA sequence equals an IUPAC-aware reverse complement of the forward export.
- **PHRED trimming**: assert defaults, threshold changes, summary text, and trimmed export length/content behavior.
- **IUPAC find/search**: assert known match counts, active range changes, ambiguous-code behavior, previous/next, clear, and no-match UI.
- **Metadata + peaks**: assert metadata fields and peak/channel values visible through user paths.
- **Workspace + SVG**: assert two tabs, tab switching, close behavior, and SVG content that reflects the active edited trace.
- **Mixed-base toggle/calling**: assert threshold/toggle state and exact ambiguous-count behavior from parser/caller output.
- **Annotation track**: assert ORF and restriction rows/chips, pointer navigation, keyboard navigation, and viewport updates.
- **Edit + undo/redo propagation**: assert sequence span text/class, undo/redo states, and exact edited position in FASTA, FASTQ, QUAL, and SVG.
- **Quality track**: assert toggle visibility, bar count, x alignment to peak positions, resize reflow, and light/dark theme tokens/repaint.
- **Keyboard/focus/ARIA**: assert Tab reachability, visible focus styles, accessible names, roles, and pressed/expanded/disabled states.
- **Responsive/touch**: assert tablet/narrow mobile no horizontal overflow, minimum touch targets, pinch/pan/tap behavior, and layout containment.
- **Devlog**: assert new blog page is linked from `blog/index.html` and registered in `vite.config.ts`; build output proves registration.
- **CI green**: include verbatim output from all validation commands in the handoff/PR body.
