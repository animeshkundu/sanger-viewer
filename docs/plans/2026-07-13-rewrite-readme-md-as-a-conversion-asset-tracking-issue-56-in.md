# Plan: rewrite README as a conversion asset

- **Date:** 2026-07-13
- **Owner:** animeshkundu/sanger-viewer contributors
- **Tracking issue:** [#56](https://github.com/animeshkundu/sanger-viewer/issues/56)
- **Research:** [README conversion asset research](../research/2026-07-13-rewrite-readme-md-as-a-conversion-asset-tracking-issue-56-in.md)
- **Unit:** `unit-id: b7554ea5-5d19-4fc7-bd01-db91c87a7bbc`

## Scope

Implementation will modify only:

- `README.md`
- `docs/media/sanger-viewer-hero.png` (new)

The two dated research/plan documents are controller-requested durable planning artifacts created before implementation; no application, test, workflow, changelog, learning, or community-health file will be changed.

## Step-by-step implementation

1. **Establish the pre-change baseline**
   - Confirm the working tree contains only the approved planning artifacts.
   - Run the repository’s complete validation sequence and preserve actual output: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Record any pre-existing failure without weakening, skipping, or retry-hiding it.

2. **Verify claims before writing**
   - Recheck the canonical live URL and the official SnapGene Viewer, FinchTV, and Chromas pages.
   - Confirm the current application still auto-loads the bundled sample, processes traces client-side, supports `.ab1` and `.scf`, and exposes each feature selected for the compact list.
   - Use qualified comparison wording where free editions, platform support, or feature depth differ.

3. **Capture the genuine hero image**
   - Build the production application.
   - Start the built output with Vite preview on the existing Playwright harness port so the harness reuses it instead of starting development mode.
   - Run the desktop/light “hero on load” Playwright capture from `tests/e2e/ux-gallery.e2e.test.ts`.
   - Require its sample-loaded and nonblank-chromatogram checks to pass, then copy the resulting PNG to `docs/media/sanger-viewer-hero.png`.
   - Remove temporary gallery output and visually inspect the final image for a loaded, legible chromatogram and no transient/private data.

4. **Rewrite `README.md` for first-visit conversion**
   - Lead with a one-line job-to-be-done headline and a prominent link to `https://animesh.kundus.in/sanger-viewer/`.
   - Place the repository-relative hero image immediately beneath the opening value proposition with useful alt text.
   - Add a three-step “20-second quickstart”: open the canonical site, inspect the already-loaded sample, then drop an `.ab1` or `.scf` trace.
   - Add a compact, evidence-based comparison table for sanger-viewer, SnapGene Viewer, FinchTV, and Chromas covering free availability, private/local handling, zero-install use, and analysis depth.
   - Add a compact feature list grounded in shipped behavior, an explicit client-side/no-upload privacy statement, supported formats, concise contributor setup/validation instructions, and a “How to cite” section.
   - Keep the existing GitHub Pages base-path/deployment guidance where useful, but remove duplicate or stale conversion copy.

5. **Validate the changed artifacts**
   - Confirm only `README.md` and `docs/media/sanger-viewer-hero.png` changed during implementation.
   - Check Markdown structure, table cells, relative image path, alt text, and all links.
   - Verify the PNG is non-empty, recognized as a PNG, and displays the loaded chromatogram.
   - Scan both changed files for secrets.

6. **Run the full regression gate**
   - Run and preserve verbatim output for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Do not add, edit, skip, or delete tests: the strict file scope prohibits test-file changes, and no application code path changes. The existing Playwright capture’s genuine-image assertions and the external checks below directly exercise this documentation behavior.
   - Run code review and security validation before handoff.

7. **Commit, publish, and verify externally**
   - Commit with a Conventional Commit subject and include `unit-id: b7554ea5-5d19-4fc7-bd01-db91c87a7bbc` as the first implementation commit’s trailer.
   - Put the exact unit marker on its own line in the PR body, link issue #56, list assumptions, and include the required screenshot evidence and actual validation output.
   - After publication, verify the PR/repository README renders, its hero image request returns HTTP 200, the canonical live-site request returns HTTP 200, and the GitHub Actions `test` job is green.

## Acceptance-criterion verification

| Criterion | Reproducible checkpoint |
| --- | --- |
| One-line job statement and conversion-oriented README | Open the branch/PR repository front page and inspect the rendered opening section. |
| Real loaded chromatogram hero | Playwright’s sample-load and canvas-variance assertions pass; inspect `docs/media/sanger-viewer-hero.png`; request the branch raw-content URL and require HTTP 200. Repeat against `main` after merge. |
| Browser-native comparison | Inspect the rendered table and verify all four products and all four requested dimensions are present; cross-check wording against the linked official product sources. |
| 20-second quickstart | Follow the three rendered steps from a clean browser: open the canonical URL, observe the sample trace already loaded, and confirm the drop target accepts `.ab1`/`.scf`. |
| Live-site link | Request `https://animesh.kundus.in/sanger-viewer/`, follow redirects, and require final HTTP 200. |
| Compact feature list and citation guidance | Inspect the rendered sections; trace each feature to shipped UI/modules and confirm the citation invents neither DOI nor unverified version. |
| Strict file scope | Compare the implementation commit with its parent and require the changed paths to be exactly `README.md` and `docs/media/sanger-viewer-hero.png`. |
| Green CI | Confirm the public GitHub Actions `test` job passes all lint, typecheck, Vitest, Playwright E2E, performance, and build steps on Ubuntu. |

## Risks and mitigations

- **Live site does not return 200:** treat as a blocker; do not substitute another URL because the canonical URL is explicit.
- **Competitor facts are stale or oversimplified:** verify official sources immediately before editing and prefer precise text over icons.
- **The hero is blank or captured from development mode:** use the existing nonblank assertion and reuse a running production preview.
- **README image works locally but not on GitHub:** use a case-correct relative path and verify the public raw-content response after push.
- **Global Definition of Done conflicts with strict scope:** do not add test, CHANGELOG, LEARNINGS, or community files. State explicitly that those mission-wide criteria belong to other units and cannot be claimed by this unit.

## Explicit assumptions and open notes

- The canonical custom-domain deployment is authoritative even though the current README links the GitHub Pages domain.
- A static PNG is preferred over the existing GIF because the task requests a real screenshot under `docs/media/`.
- “How to cite” will provide a software citation template based on facts present in the repository; DOI/version claims wait for an actual release record.
- Branch naming is controller-managed. Include the marker in the branch name only if renaming is safe; the commit trailer and PR-body line remain mandatory.
- Mission-wide CHANGELOG, LEARNINGS, and community-health checks are acknowledged but excluded by this unit’s explicit file scope.
