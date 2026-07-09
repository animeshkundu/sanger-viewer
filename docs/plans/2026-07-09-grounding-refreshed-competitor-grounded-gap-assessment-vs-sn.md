# Implementation plan — refreshed competitor-grounded gap assessment vs SnapGene, Benchling, Chromas, FinchTV, and ApE

Date: 2026-07-09
Owner: GitHub cloud agent
Controller correlation marker:
unit-id: d21332c9-48df-4f4c-be3f-eaad2147eeff

## Scope decision

This work unit is docs-only. It should not modify application source, tests, fixtures, parser code, renderer code, styles, workflows, or deployment behavior. Its purpose is to create durable planning artifacts that future implementation PRs can execute against.

## Files to change

Required in this planning pass:

1. `docs/research/2026-07-09-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`
   - Refreshed competitor benchmark vs SnapGene, Benchling, Chromas, FinchTV, and ApE.
   - Rated current-state screenshot UX gallery summary.
   - Prioritized, testable backlog.
   - Risks, verification targets, and decision.

2. `docs/plans/2026-07-09-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`
   - This step-by-step implementation plan.
   - File list, approach, risks, and acceptance-criterion verification map.

Expected files for a later implementation/devlog PR, not changed in this planning-only pass unless explicitly approved:

1. `blog/2026-07-09-*/index.html`
2. `blog/index.html`
3. `vite.config.ts`

Those later files are needed only if the grounding artifact is published as a devlog page in the same PR.

## Step-by-step approach

1. Confirm repository conventions.
   - Read `docs/research/README.md` and `docs/plans/README.md`.
   - Confirm dated Markdown artifact naming.
   - Confirm existing devlog publishing convention from `blog/index.html` and `vite.config.ts`.

2. Review prior work that this artifact must ground.
   - Read the design-research devlog from #19.
   - Read the performance/reliability audit from #20.
   - Read the UX-gallery devlog and capture spec.
   - Read the v30 next-improvements research.
   - Read closed PR #46 metadata to ensure this artifact supersedes the stalled draft.

3. Refresh competitor framing.
   - Benchmark SnapGene, Benchling, Chromas, FinchTV, and ApE.
   - Keep claims tied to official product/help pages or to already-merged repository research.
   - Distinguish documented facts from reasonable inferences.

4. Rate the current screenshot UX gallery.
   - Use the existing UX-gallery state list from `tests/e2e/ux-gallery.e2e.test.ts`.
   - Score each captured state on a 1–5 UX scale.
   - Note concrete evidence and gaps for each state.
   - Make clear that future visual PRs must attach the generated `ux-gallery` CI artifact and written UX assessment.

5. Produce a prioritized backlog.
   - Convert the mission goals into P0/P1/P2 work slices.
   - Ensure each backlog item is independently shippable.
   - Include concrete verification hooks for first run, design-system cohesion, delight, accessibility, performance, and feature preservation.

6. Keep the artifacts docs-only.
   - Do not edit `src/`, `tests/`, parser fixtures, renderer code, workflows, or styles.
   - Do not open a pull request in this planning pass.
   - Commit only the two requested Markdown files.

7. Validate.
   - Run repository validation appropriate for the docs-only artifact and requested Definition of Done:
     - `npm run lint`
     - `npm run typecheck`
     - `npm run test`
     - `npm run build`
   - Run secret scanning on changed Markdown files before committing.
   - Document any blocker explicitly rather than reducing scope silently.

## Acceptance-criterion verification map

1. **Competitor-benchmarked**
   - Verified by the research artifact’s competitor table covering SnapGene, Benchling, Chromas, FinchTV, and ApE.
   - Verified by explicit reference to #46 as superseded.
   - Verified by a prioritized, testable backlog.

2. **Frictionless first run**
   - Verified in this docs pass by specifying first-run acceptance checks: sample auto-load, dropzone, one-click sample data, loading/error/empty states.
   - Future implementation PRs must verify with Playwright and UX-gallery screenshots.

3. **Cohesive design system**
   - Verified in this docs pass by naming the token and component consolidation targets.
   - Future implementation PRs must verify light/dark parity and avoid fragmented styles.

4. **Delight**
   - Verified in this docs pass by defining purposeful, reduced-motion-safe micro-interaction targets.
   - Future implementation PRs must verify through screenshot review and motion/performance checks.

5. **Accessibility**
   - Verified in this docs pass by defining WCAG 2.1 AA acceptance checks.
   - Future implementation PRs must verify keyboard, focus, contrast, ARIA, touch, and narrow-mobile behavior.

6. **Performance**
   - Verified in this docs pass by tying future work to the existing perf audit and perf smoke budgets.
   - Future implementation PRs must run the perf harness and avoid redraw/regression risks.

7. **Power preserved**
   - Verified in this docs pass by listing the feature-preservation checklist.
   - Future implementation PRs must add regression coverage for any touched capability.

8. **Every PR gate**
   - Verified in this docs pass by documenting the expected full validation commands, UX-gallery artifact, written UX assessment, and devlog update requirement for future PRs.

## Key risks

1. **The plan may be too broad for small PRs.**
   - Mitigation: the backlog is split into P0/P1/P2 independently shippable slices.

2. **Competitor claims may overstate undocumented behavior.**
   - Mitigation: mark inferred gaps as inferences and keep source trail visible.

3. **Docs-only work cannot prove UI superiority by itself.**
   - Mitigation: this artifact grounds the build wave; future implementation PRs must carry screenshot-gated evidence.

4. **Future design changes could regress advanced features.**
   - Mitigation: preserve an explicit power-feature checklist and require touched-feature tests.

5. **Full validation may surface unrelated pre-existing failures.**
   - Mitigation: paste actual command output, report blockers, and do not hide failures with skips or scope reduction.

## Completion checklist for this planning pass

- [x] Research artifact created under `docs/research/`.
- [x] Plan artifact created under `docs/plans/`.
- [ ] Secret scan changed Markdown files.
- [ ] Run validation commands and capture actual output.
- [ ] Commit/push the two docs artifacts.
- [ ] Stop without opening a pull request.

