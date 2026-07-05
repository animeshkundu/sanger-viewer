# Competitor-grounded all-dimensions gap assessment — research notes

Date: 2026-07-05

## Purpose

This is the durable research/finding artifact for the next implementation pass. It does **not** complete the final assessment yet; it records the repository evidence, source list, measurement plan, and risks needed to produce one docs-only PR under `docs/research/` with a world-class gap assessment of `sanger-viewer`.

## Repository findings

### Existing app positioning

- `README.md` positions `sanger-viewer` as a browser-native, client-side/private Sanger trace viewer for `.ab1` and `.scf` files, with drag/drop, file picker, sample trace, quality shading, base labels, zoom/pan, hover tooltip, sequence panel, edits, Q-trim, mixed-base calling, annotations, base inspection, multi-trace consensus, PNG/SVG/FASTA export, reference alignment, variant review, contig assembly, primer/in-silico PCR, and permalinks.
- `README.md` explicitly names SnapGene Viewer, FinchTV, and Chromas as desktop-first comparisons.
- `docs/specs/` already contains differentiator specs for shareable permalinks, batch import/review, session workspaces, reference context, paired-read contig assembly, disagreement review, reference alignment, variant calling/review, primer design/Tm, and in-silico PCR.
- Existing research in `docs/research/next-killer-features.md` already identifies high-value next-wave areas: plasmid/restriction overlay, manual assembly controls, multi-trace clone-screen mode, artifact-aware basecalling, BLAST handoff, heterozygous-indel support, clone-screening report, and optional external variant annotation.

### Existing UX-gallery harness to reuse

- `npm run ux:gallery` runs `playwright test tests/e2e/ux-gallery.e2e.test.ts && tsx scripts/generate-ux-gallery-html.ts`.
- `tests/e2e/ux-gallery.e2e.test.ts` captures the enumerated state × theme × viewport matrix:
  - States: `hero-on-load`, `sidebar-expanded`, `sidebar-collapsed`, `inspect-panel`, `map-panel`, `analyze-panel`, `share-panel`, `empty-state`, `loading-state`, `toolbar-export-menu`, `keyboard-focus`, `hover-tooltip`.
  - Themes: light and dark.
  - Viewports: desktop 1280×720, tablet 810×1080, narrow-mobile 360×640.
  - Mobile skips `keyboard-focus` and `hover-tooltip` by design.
- `tests/e2e/helpers/ux-gallery.ts` includes deterministic setup, sample-load wait, non-blank chromatogram canvas checks, and screenshot capture helpers.
- `scripts/generate-ux-gallery-html.ts` bundles screenshots into a self-contained `ux-gallery-screenshots/index.html` artifact with commit/run metadata and grouped thumbnails.
- `blog/2026-07-05-v28-ux-gallery/index.html` documents the harness and contains an initial UX assessment with known issues: narrow-mobile sidebar overflow, empty-state visual weight, loading guidance, export discoverability, and hover tooltip hit target.

### Existing performance/reliability fixtures and harnesses

- `fixtures/PROVENANCE.md` lists committed real public traces:
  - `fixtures/ab1/310.ab1` and `fixtures/ab1/3100.ab1` from the Biopython `Tests/Abi` corpus.
  - `fixtures/large/3730.ab1` from Biopython, 1,165 bases, 300 KB.
  - `fixtures/scf/abcZ_F.scf` from the CutePeaks example corpus.
- Synthetic stress fixtures are also available under `fixtures/large/`, including 3 kbp, low-quality 800 bp, and 5 kbp traces.
- `tests/core/performance-smoke.test.ts` measures parsing of `fixtures/large/3730.ab1` under 500 ms and decimation under 20 ms.
- `npm run perf:smoke` is the focused performance smoke command.

### Existing validation commands

From `package.json` and `README.md`:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run perf:smoke`
- `npm run build`
- `npm run ux:gallery`

## Competitor/source evidence to ground the final report

Use primary sources wherever possible. Avoid relying on unsourced aggregator claims except as discovery leads.

| Source id | Tool/source | Evidence to use in final assessment |
|---|---|---|
| C1 | SnapGene features — https://www.snapgene.com/features | Plasmid maps, enzyme sites, features, primers, ORFs, translations, alignment to reference, pairwise/multiple alignment, and Sanger read contig assembly using CAP3. Strong benchmark for integrated molecular-cloning context and documentation polish. |
| C2 | Geneious Sanger feature page — https://www.geneious.com/features/sanger-sequence-analysis/ | “Trim, assemble, and view Sanger sequencing trace files,” SNP detection and variant calling, Sanger chromatogram view, Sanger alignments, Sanger variants, and adjacent primer/cloning/annotation capabilities. Strong benchmark for full professional analysis suite. |
| C3 | Chromas — https://technelysium.com.au/wp/chromas/ | Free Windows trace viewer for simple projects; opens AB1/SCF/ZTR; exports FASTA/FASTQ/etc.; trims low-quality/vector sequence; reverse-complements sequence and chromatogram; searches subsequences; displays 3-frame translations; batch conversion/export/printing/raw data; explicitly points multi-read assembly users to ChromasPro. Benchmark for durable utility and broad export/batch basics. |
| C4 | 4Peaks — https://nucleobytes.com/4peaks/index.html | Mac app for AB1/SCF viewing/editing; quality data displayed on traces; horizontal/vertical scaling; mark selections; PDF publication figures; live translation; motif search; BLAST; speech support; one-click trimming; double-click base edits. Benchmark for bench-scientist delight and fast single-read interpretation. |
| C5 | Benchling — https://www.benchling.com/ | Collaborative, cloud-based notebook/platform; planning, recording, sharing experiments; integrations and data platform. Use as an adjacent web UX/collaboration benchmark, not as a deep chromatogram benchmark unless Sanger-specific docs are separately found. |
| C6 | UGENE — https://www.ugene.net/ | Unified open-source bioinformatics toolkit with peer-reviewed citations. Use as an adjacent open-source breadth/bioinformatics benchmark. Additional direct Sanger/trace documentation should be found before making specific chromatogram claims. |
| C7 | Tracy paper — https://doi.org/10.1186/s12864-020-6635-8 | Peer-reviewed statement: lack of user-friendly Sanger analysis tools that can run interactively as web apps or at large scale from CLI; Tracy supports basecalling, alignment, assembly, deconvolution, web apps, JSON/BCF outputs, clinical/high-throughput validation use cases. Strong evidence for web + batch + reporting needs. |
| C8 | CutePeaks issue #50 — https://github.com/labsquare/CutePeaks/issues/50 | Real reliability gap: some AB1 files lack PBAS/PLOC/PCON/DATA tags, requiring fallback basecalling from raw trace. Use for parser/basecalling robustness backlog. |
| C9 | CutePeaks issue #31 — https://github.com/labsquare/CutePeaks/issues/31 | Multi-AB1 aligned view request. Fetching through the available tool returned mostly GitHub chrome; verify issue body directly during implementation before citing details. |
| C10 | FinchTV | The attempted `digitalworldbiology.com/FinchTV` fetch hit a CAPTCHA redirect. Use archived/vendor-independent evidence only if accessible; otherwise avoid overclaiming and cite only high-confidence, accessible pages. |

## Draft comparison dimensions for the final matrix

The final benchmark should compare `sanger-viewer` against SnapGene, Geneious, Chromas/ChromasPro, FinchTV, 4Peaks, Benchling, UGENE, Tracy, and CutePeaks on:

1. Open `.ab1` and `.scf` traces.
2. Install-free web access.
3. Local/private processing.
4. First impression/sample/demo quality.
5. Chromatogram readability and zoom/pan.
6. Quality display and trimming.
7. Base editing/undo/redo.
8. Mixed-base/IUPAC support.
9. Search/navigation.
10. Annotations/features/ORFs/restriction context.
11. Plasmid/reference context.
12. Reference alignment.
13. Variant review/calling.
14. Paired-read assembly/contig review.
15. Multi-trace/clone-screen workflows.
16. Batch import/triage/reporting.
17. Export formats and publication-ready figures.
18. Sharing/collaboration/permalinks.
19. Mobile/tablet support.
20. Accessibility/keyboard support.
21. Performance on real files.
22. Reliability/fallback behavior on malformed or incomplete trace files.
23. Documentation/help/onboarding.
24. Overall bench-scientist delight.

For every cell, label evidence strength: primary-source confirmed, repo-observed, measured locally, or unknown/not verified.

## Bench-scientist walkthrough scope

Use a concrete persona: a wet-lab scientist verifying a cloned construct from fresh Sanger reads during a same-day decision window.

Rate each key flow 1–5, with friction notes and “what a world-class version does instead”:

1. Arrive at the app / understand what to do.
2. Load sample or real `.ab1`/`.scf` file.
3. Read status/metadata and confirm file identity.
4. Inspect chromatogram peaks and quality.
5. Zoom, pan, and navigate to a region/base.
6. Use tooltip/base inspector/sequence panel for a specific base.
7. Search for expected sequence/primer/feature.
8. Apply quality trimming and understand what changed.
9. Edit or confirm a base call and recover from mistakes.
10. Review mixed bases/IUPAC calls.
11. Open reference/map/analyze/share panels.
12. Align to reference and review variants.
13. Build/review paired-read contig or consensus.
14. Export FASTA/FASTQ/PNG/SVG/print evidence.
15. Share exact state with a collaborator.
16. Use the app on tablet/mobile while at the bench.
17. Recover from wrong file, unsupported file, missing metadata, slow load, or narrow viewport.

## Screenshot gallery assessment plan

Run `npm run ux:gallery` and inspect the generated `ux-gallery-screenshots/index.html` plus individual PNGs. The final research doc should include a rated table for every captured state/theme/viewport category, not embed all images directly unless file size remains appropriate.

Recommended rating fields:

- State.
- Viewport(s).
- Theme(s).
- UI rating 1–5.
- UX rating 1–5.
- What is working.
- Evidence observed in screenshot.
- Specific actionable fixes.
- Testable follow-up assertion.

Known initial issues to verify from `blog/2026-07-05-v28-ux-gallery/index.html`:

- Narrow-mobile sidebar overflow / need for sheet-overlay or bottom-sheet behavior.
- Empty-state visual weight.
- Loading-state guidance.
- Export menu discoverability and clipping risk.
- Hover tooltip hit target.

## Measurement plan for performance/reliability/consistency

Use existing fixtures only; do not add app behavior changes.

Minimum measurements to collect and report:

| File | Type | Observation target |
|---|---|---|
| `public/sample.ab1` | AB1 | First-impression path, render readiness, UX gallery baseline. |
| `fixtures/ab1/310.ab1` | real AB1 | Parser reliability, metadata/base count, UI load status if manually loaded through Playwright. |
| `fixtures/ab1/3100.ab1` | real AB1 | Parser reliability and consistency vs another real ABI instrument fixture. |
| `fixtures/large/3730.ab1` | real large AB1 | Parse time, decimation/render responsiveness, large-file reliability. |
| `fixtures/scf/abcZ_F.scf` | real SCF | SCF parser reliability and UI consistency vs AB1. |
| `fixtures/large/synth-lowq-800bp.ab1` | synthetic low-quality AB1 | Low-quality UX, trim/readability stress. |
| `fixtures/large/synth-longread-5kbp.ab1` | synthetic stress AB1 | Long trace performance/stability caveat; separate from real-file claims. |

Report measured numbers from actual commands, including machine/context and whether they are unit perf harness numbers or browser-observed timings. Do not mix synthetic stress results into “real file” claims.

## Prioritized backlog scoring model

Use a single top-N list, not separate UI/perf/docs lists. Score every item as:

`Priority score = need × impact × feasibility`

Each item must be a testable outcome, for example:

- “At 360×640, opening any sidebar panel displays as a modal sheet that is fully scrollable and does not push the chromatogram below the first viewport; Playwright screenshot/state test passes.”
- “Given an AB1 without PBAS/PLOC/PCON but with raw channel data, the parser produces a flagged fallback basecall track or a specific actionable error; fixture test covers both paths.”
- “Given forward and reverse reads plus a reference, a scientist can produce a one-page clone verification report with mismatch table, trace evidence screenshot, and export timestamp.”

Candidate backlog themes to evaluate:

1. Mobile/tablet bench workflow layout.
2. Guided onboarding/file drop/sample selection.
3. Evidence-grade export/reporting.
4. Batch/clone-screen triage.
5. Parser/basecalling fallback robustness.
6. Artifact/low-quality warnings.
7. Reference/plasmid context parity.
8. Alignment/variant confidence explanations.
9. Share/collaboration documentation and guardrails.
10. Docs/tutorial “verify a clone from two reads” walkthrough.

## Key risks and mitigations

- **Risk: final report makes unsupported competitor claims.** Mitigation: use primary product pages, peer-reviewed paper, and accessible GitHub issues; label unknowns explicitly.
- **Risk: screenshot gallery is generated but not actually assessed.** Mitigation: include a rated table with every required state and viewport category; cite the generated artifact path and captured state list.
- **Risk: performance claims are anecdotal.** Mitigation: paste actual command output and record measured parse/decimation/browser observations with file names.
- **Risk: docs-only PR accidentally includes screenshots/build artifacts.** Mitigation: do not commit `ux-gallery-screenshots/`, Playwright reports, coverage, or generated build output unless explicitly intended; only cite local artifact names.
- **Risk: Definition of Done says “add tests,” but the work unit says docs-only/no behavior changes.** Mitigation: do not add app tests in the final docs-only PR; instead document this conflict in the verification section and rely on existing suites plus generated UX-gallery evidence.
- **Risk: devlog omitted.** Mitigation: add a human-voice dated devlog entry under `blog/` and update `blog/index.html` if that is how entries are listed.

## Proposed final artifact structure

The implementation pass should create one final dated report under `docs/research/`, likely:

`docs/research/2026-07-05-world-class-gap-assessment.md`

Recommended sections:

1. Executive verdict.
2. Method and evidence standard.
3. Competitor benchmark matrix.
4. Where `sanger-viewer` wins/loses.
5. Bench-scientist end-to-end walkthrough with 1–5 ratings.
6. Rated screenshot UX gallery.
7. Performance/reliability/consistency observations.
8. Prioritized testable top-N backlog for the next build wave.
9. Verification and acceptance-criteria checklist.
10. Source index.

