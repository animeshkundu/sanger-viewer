# Implementation plan: refreshed competitor-grounded gap assessment vs SnapGene, Benchling, Chromas, FinchTV, and ApE

Date: 2026-07-07  
Owner: @animeshkundu / cloud-agent work unit  
Status: ready for review before implementation  
Controller marker: `cda200be-4d1c-4e30-87e4-fcb80b87ef52`

## Goal

Ship a small, docs-only grounding PR that supersedes the stalled empty gap-assessment PR #46 and gives parallel implementation agents a shared, competitor-benchmarked, screenshot-rated, testable backlog for making `sanger-viewer` category-leading on user-friendliness, UI cohesion, accessibility, performance, and delight.

This plan intentionally avoids app-code changes. The only implementation change proposed for the grounding PR is documentation/devlog content.

## Files to change

Required by this work unit:

1. `docs/research/2026-07-07-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`
   - Add refreshed competitor benchmark vs SnapGene, Benchling, Chromas, FinchTV, and ApE.
   - Include current-state screenshot UX-gallery ratings.
   - Include prioritized, testable improvement backlog.
   - Include source links and repository evidence.

2. `docs/plans/2026-07-07-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`
   - Add this step-by-step implementation plan for review and later handoff.

Recommended for the eventual docs-only grounding PR, after review approval:

3. `blog/2026-07-07-grounding-gap-assessment/index.html`
   - Add a devlog entry summarizing the refreshed benchmark, screenshot-rating results, and prioritized backlog.
   - Include a written UX-quality review: “is this great UX?” and “what to improve next?”
   - Include the controller marker on its own line in the content or PR body, not as visible marketing copy.

4. `blog/index.html`
   - Link the new devlog entry at the top.

Optional only if reviewers request it:

5. `LEARNINGS.md` or `CHANGELOG.md`
   - Add a short note only if the repository maintainers want durable learning/changelog coverage for docs-only research. Avoid duplicating the full report.

## Step-by-step approach

1. Confirm branch and marker.
   - Use a branch name containing `cda200be-4d1c-4e30-87e4-fcb80b87ef52` if possible.
   - Include `unit-id: cda200be-4d1c-4e30-87e4-fcb80b87ef52` as a commit-message trailer for the first commit.
   - Include the marker on its own line in the eventual PR body.

2. Review current repository evidence.
   - Read `docs/research/next-killer-features.md`.
   - Read `blog/2026-07-04-v17-design-research/index.html`.
   - Read `blog/2026-07-04-v19-perf-harness/index.html`.
   - Read `blog/2026-07-05-v28-ux-gallery/index.html`.
   - Read `blog/2026-07-05-v29-front-door-polish/index.html`.
   - Read `blog/2026-07-05-v30-next-improvements-research/index.html`.
   - Read `tests/e2e/ux-gallery.e2e.test.ts` and `package.json` to confirm screenshot and validation gates.
   - Read `src/style.css` only to understand existing token categories; do not change it in this docs-only PR.

3. Refresh competitor evidence.
   - Use official/public product pages wherever possible.
   - Cover exactly the requested competitors: SnapGene, Benchling, Chromas, FinchTV, ApE.
   - Separate observed/documented facts from explicit inferences.
   - Avoid overclaiming private/authenticated feature surfaces.

4. Produce the research artifact.
   - Summarize current app capability and why the next gap is experiential rather than raw functionality.
   - Add a rating matrix across first-run friction, trace-reading clarity, workflow depth, UI cohesion, accessibility/mobile, and privacy/local-first.
   - Add per-competitor takeaways.
   - Add a rated current-state screenshot gallery table using the existing UX-gallery state matrix.
   - Add a prioritized, testable backlog mapped to acceptance criteria.

5. Produce the plan artifact.
   - List exact files to change.
   - List approach, validation plan, risks, and acceptance-criteria verification.
   - Keep it actionable for a future implementation agent.

6. After review approval, add the devlog entry.
   - Create `blog/2026-07-07-grounding-gap-assessment/index.html` following existing devlog structure.
   - Link it from `blog/index.html`.
   - Keep the devlog concise and focused; the full details live in `docs/research/` and `docs/plans/`.
   - Preserve GitHub Pages base-path support and existing static HTML conventions.

7. Validate documentation-only changes.
   - Run `npm run lint`.
   - Run `npm run typecheck`.
   - Run `npm run test`.
   - Run `npm run build` because devlog/static HTML changes should continue to build.
   - If the devlog page is added, also run or inspect `npm run build` output to confirm the page is included by Vite if applicable.
   - If screenshots are regenerated in the implementation PR, run `npm run ux:gallery` and attach `ux-gallery-screenshots/index.html` as the screenshot gate evidence.

8. Secret and attribution checks.
   - Scan changed files with the secret-scanning tool before committing.
   - Ensure no AI/Claude/Anthropic/LLM attribution appears in docs, commit messages, PR body, or comments.

9. Commit and hand off.
   - Use a Conventional Commit message such as `docs: add refreshed competitor gap assessment`.
   - Include commit trailer: `unit-id: cda200be-4d1c-4e30-87e4-fcb80b87ef52`.
   - In the eventual PR body, include the marker on its own line.
   - Do not open a PR until explicitly asked.

## Key risks and mitigations

1. **Risk: research becomes too broad.**
   - Mitigation: keep this PR docs-only and limit the benchmark to the five named competitors.

2. **Risk: current-state screenshot ratings are treated as final without fresh screenshots.**
   - Mitigation: label the ratings as grounded in existing v28/v29 evidence and require `npm run ux:gallery` in the implementation PR.

3. **Risk: overclaiming competitor limitations.**
   - Mitigation: distinguish official-source facts from inference, especially for Benchling and ApE.

4. **Risk: future UI PRs fragment styles.**
   - Mitigation: backlog explicitly requires reuse of `src/style.css` tokens and shared components/patterns.

5. **Risk: feature power regresses during polish.**
   - Mitigation: every follow-up PR must verify editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace workflows if shared UI surfaces are touched.

6. **Risk: delight changes hurt performance.**
   - Mitigation: require `npm run perf:smoke` and avoid animation/layout work in chromatogram hot paths.

7. **Risk: docs-only PR fails screenshot-gate expectation.**
   - Mitigation: for this grounding PR, the screenshot gate should be satisfied by running `npm run ux:gallery` unchanged and adding a written UX review; no visual diff is expected.

## Acceptance-criteria verification plan

1. **Competitor-benchmarked**
   - Verify the research file covers SnapGene, Benchling, Chromas, FinchTV, and ApE.
   - Verify it includes current-state screenshot ratings and a prioritized, testable backlog.
   - Verify it cites repository and public-source evidence.

2. **Frictionless first run**
   - Verify the research assesses sample auto-load, local/private opening, empty-state/dropzone, sample CTA, loading state, and error-state backlog.
   - For future implementation PRs, verify with `front-door-polish.e2e.test.ts` and UX-gallery screenshots.

3. **Cohesive design system**
   - Verify the backlog includes a design-token cohesion audit across all panels/states in light and dark.
   - Future PRs must reuse existing tokens/components and avoid one-off styling.

4. **Delight**
   - Verify the backlog prioritizes purposeful micro-interactions: empty-state illustration/CTA, reduced-motion shell transitions, pointer/touch forgiveness, and responsive feedback.
   - Future PRs must include written UX-quality review and reduced-motion evidence.

5. **Accessibility**
   - Verify the backlog calls out WCAG 2.1 AA, keyboard operability, focus, contrast, ARIA, and narrow-mobile/touch.
   - Future PRs must include E2E or computed-style assertions where applicable.

6. **Performance**
   - Verify the backlog calls out ~60fps pan/zoom and existing perf harness protection.
   - Future PRs must run `npm run perf:smoke` when touching interaction/rendering paths.

7. **Power preserved**
   - Verify the backlog names every existing feature that must not regress: editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace.
   - Future PRs must run targeted E2E smoke coverage when shared UI surfaces move.

8. **Every-PR requirements**
   - Verify the plan requires CI-green validation, screenshot gate, written UX review, devlog update, no regressions, no hidden scope reduction, and no AI/LLM attribution.

## Validation commands for this docs-only artifact commit

Run and paste actual output before declaring work complete:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

No new automated tests are proposed for this planning-only/docs-only dispatch because there is no changed executable behavior. The implementation PRs that modify UI behavior must add failing-before-change tests for each behavior change.

## Handoff checklist

- [ ] Research artifact committed.
- [ ] Plan artifact committed.
- [ ] Devlog update planned for implementation PR or added if reviewer approves expanding this dispatch.
- [ ] Validation output captured verbatim.
- [ ] Changed files scanned for secrets.
- [ ] Acceptance criteria verified one by one.
- [ ] No pull request opened unless explicitly requested.
