# Implementation plan — competitor-grounded all-dimensions world-class gap assessment

Date: 2026-07-05

## Task classification

This work unit is a docs/research implementation task, not an app behavior change. The final implementation should produce a docs-only PR with evidence, measurements, a UX-gallery assessment, a devlog update, and no production-code changes.

## Files to change

### Required final report

- `docs/research/2026-07-05-world-class-gap-assessment.md`
  - The single dated research entry satisfying the acceptance criteria.
  - Include competitor matrix, bench-scientist walkthrough, screenshot UX gallery assessment, measured perf/reliability/consistency observations, and one prioritized testable backlog.

### Devlog

- `blog/2026-07-05-v30-world-class-gap-assessment/index.html` or the next appropriate dated/versioned devlog directory.
- `blog/index.html` if entries are manually listed there.

### Planning/research artifacts already prepared for the implementation task

- `docs/research/2026-07-05-produce-the-competitor-grounded-all-dimensions-world-class-g.md`
- `docs/plans/2026-07-05-produce-the-competitor-grounded-all-dimensions-world-class-g.md`

### Files that should not change

- No `src/**` files.
- No tests should be added or edited unless reviewers explicitly override the docs-only requirement.
- Do not commit `ux-gallery-screenshots/`, Playwright reports, build output, coverage, or temporary measurement files.

## Step-by-step plan

1. **Confirm clean docs-only baseline**
   - Run `git status --short`.
   - Re-read `README.md`, `docs/research/next-killer-features.md`, `fixtures/PROVENANCE.md`, `tests/e2e/ux-gallery.e2e.test.ts`, `tests/e2e/helpers/ux-gallery.ts`, `scripts/generate-ux-gallery-html.ts`, and the v28 UX-gallery devlog.
   - Verify no hidden requirement has changed.

2. **Gather and lock evidence sources**
   - Use primary competitor docs for SnapGene, Geneious, Chromas/ChromasPro, 4Peaks, Benchling, UGENE, Tracy, CutePeaks, and FinchTV if accessible.
   - Record exact source URLs and the specific claim each supports.
   - Mark unavailable or weak sources as “not verified” instead of filling gaps with assumptions.

3. **Generate the local UX gallery**
   - Run `npm run ux:gallery`.
   - Inspect `ux-gallery-screenshots/index.html` and the generated PNG names.
   - Confirm coverage of desktop, tablet, and narrow-mobile; light/dark themes; and all required states from the harness.
   - Do not commit the generated screenshot folder unless explicitly requested.

4. **Measure performance/reliability/consistency**
   - Run `npm run perf:smoke` and capture verbatim output.
   - Use existing parser tests or a temporary `/tmp` measurement command/script to collect parse times and base/sample metadata for:
     - `public/sample.ab1`
     - `fixtures/ab1/310.ab1`
     - `fixtures/ab1/3100.ab1`
     - `fixtures/large/3730.ab1`
     - `fixtures/scf/abcZ_F.scf`
   - If browser-load timing is measured, use Playwright/devtools instrumentation without changing app code, and store temporary scripts only under `/tmp`.
   - Separate real-file observations from synthetic stress-fixture observations.

5. **Write the final research report**
   - Create `docs/research/2026-07-05-world-class-gap-assessment.md`.
   - Include an executive verdict that clearly states where `sanger-viewer` is already strong and where it trails world-class tools.
   - Add a competitor feature + UX matrix with wins/losses and evidence labels.
   - Add the bench-scientist walkthrough with 1–5 ratings for every key flow, concrete friction notes, and world-class alternatives.
   - Add the screenshot gallery assessment table with UI/UX ratings and specific fixes for all key states across desktop/tablet/mobile.
   - Add measured performance/reliability/consistency observations with file names, command outputs, and named issues.
   - Add a single prioritized top-N backlog scored by need × impact × feasibility; phrase every item as a testable outcome and explicitly state how it grounds the subsequent build wave.

6. **Update the devlog**
   - Add a human-voice devlog entry summarizing what the assessment found, why it matters, and how the next build wave should use it.
   - Update the devlog index if required by the existing blog structure.
   - Avoid tool/vendor attribution language.

7. **Validate docs-only scope**
   - Run `git diff --name-only` and confirm changes are only under `docs/` and `blog/`.
   - Confirm no generated screenshot/build artifacts are staged.
   - Confirm no app behavior files changed.

8. **Run full validation**
   - Run and capture actual verbatim output for:
     - `npm run lint`
     - `npm run typecheck`
     - `npm run test`
     - `npm run test:e2e`
     - `npm run perf:smoke`
     - `npm run build`
   - Also run `npm run ux:gallery` because the acceptance criteria explicitly require using the existing screenshot/UX-gate harness.
   - If any command fails for an unrelated pre-existing reason, report the failure verbatim and do not hide it.

9. **Acceptance-criteria verification**
   - Verify one-by-one in the final response and/or report:
     1. Competitor benchmark matrix included with where `sanger-viewer` wins/loses.
     2. Bench-scientist walkthrough included with 1–5 ratings, friction notes, and world-class alternatives.
     3. Screenshot gallery assessment included for desktop/tablet/mobile using the existing harness.
     4. Performance/reliability/consistency observations measured on real `.ab1`/`.scf` files.
     5. Single prioritized top-N backlog included, scored by need × impact × feasibility, with testable outcomes.
     6. CI-relevant validation run and output pasted.
     7. Devlog updated.
     8. No code/app behavior changes.

10. **Commit and PR**
    - Commit through the provided progress/reporting tool, not direct push.
    - Create a PR only if explicitly asked by the user for the implementation pass.

## Key risks

- Competitor pages may be partially inaccessible or marketing-heavy; mitigate by labeling evidence strength and using primary pages or peer-reviewed sources.
- The generated UX-gallery artifact may be large; do not commit it unless explicitly requested.
- Full `test:e2e` can be slow or flaky; capture verbatim output and identify whether failures are related to docs-only changes.
- The Definition of Done says tests must be added, but the work unit also requires docs-only/no behavior changes. For this task, do not add tests unless the reviewer resolves that conflict in favor of test changes.
- Devlog entries are plain HTML, so keep formatting consistent with existing entries and manually update the index if needed.

## Verification strategy by acceptance criterion

| Acceptance criterion | Verification approach |
|---|---|
| One docs-only PR under `docs/research/` | `git diff --name-only`; final report path under `docs/research/`; no `src/**` changes. |
| Competitor benchmark matrix | Inspect report sections for matrix, feature dimensions, UX dimensions, source ids, and win/loss column. |
| Bench-scientist walkthrough | Inspect report for all key flows with 1–5 ratings, friction notes, and world-class alternative notes. |
| Screenshot gallery all key UX states | Run `npm run ux:gallery`; confirm generated manifest/screenshots include required state/theme/viewport matrix; inspect report table covers them. |
| Measured perf/reliability/consistency on real `.ab1`/`.scf` files | Confirm report includes named real fixture files and measured command/browser observations. |
| Single prioritized top-N backlog | Confirm one ranked list with need, impact, feasibility, score, and testable outcome wording. |
| CI green/full validation | Paste actual output from lint, typecheck, unit tests, e2e, perf smoke, build, and UX gallery. |
| Devlog updated | Confirm new `blog/` entry and index update if applicable. |
| No code/behavior changes | Confirm no production source files, test files, configs, or generated app assets changed. |

