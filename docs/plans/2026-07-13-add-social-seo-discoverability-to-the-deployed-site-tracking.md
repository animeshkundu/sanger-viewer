# Add social and SEO discoverability

- **Date:** 2026-07-13
- **Owner:** @animeshkundu
- **Tracking issue:** #55
- **Work unit:** `596e81bf-a756-4edc-b204-8e9e571769bc`

## Goal

Make the deployed home page discoverable by search engines and render a branded, genuine chromatogram preview when shared, without changing application behavior, adding dependencies, transmitting trace data, or breaking the GitHub Pages base path.

## Scope

Implementation changes are limited to:

- `index.html`
- `public/og-image.png`
- `public/robots.txt`
- `public/sitemap.xml`
- `vite.config.ts` only if a build proves that normal Vite public-asset copying is insufficient

The requested research and plan artifacts are the only pre-implementation exceptions to that file scope. Do not edit README, changelog, learnings, `.github/`, `src/`, tests, or `docs/media/`.

## Assumptions

- The production and canonical base URL is `https://animesh.kundus.in/sanger-viewer/`.
- The social image URL is `https://animesh.kundus.in/sanger-viewer/og-image.png`.
- The description will identify the viewer as a private, browser-native AB1/SCF chromatogram viewer with base calls and quality scores.
- The optional manifest/icons are deferred because they are not needed for social/SEO acceptance.
- Strict file scope overrides the generic “add tests” instruction. Since test files are prohibited, verification will directly inspect built output and use existing E2E coverage; the PR must disclose this constraint.
- README, changelog/learnings, and community-health checks are separate mission units and are not deliverables of this scoped implementation.

## Implementation steps

1. **Establish the pre-change baseline**
   - Confirm the working tree contains only the approved planning artifacts.
   - Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Preserve actual command output for the handoff and distinguish any pre-existing failure from implementation regressions.

2. **Add crawler and social metadata to `index.html`**
   - Add one concise `<meta name="description">`.
   - Add `og:title`, `og:description`, `og:image`, `og:url`, and `og:type` tags.
   - Add `<meta name="twitter:card" content="summary_large_image">`.
   - Add an absolute canonical link.
   - Keep title/description wording consistent between standard and Open Graph metadata.
   - Use production absolute URLs so metadata remains correct under the `/sanger-viewer/` base path.

3. **Create `public/robots.txt`**
   - Allow all user agents.
   - Add an absolute sitemap declaration for `https://animesh.kundus.in/sanger-viewer/sitemap.xml`.
   - Keep the policy permissive and static.

4. **Create `public/sitemap.xml`**
   - Use valid sitemap XML.
   - Include only:
     - `https://animesh.kundus.in/sanger-viewer/`
     - `https://animesh.kundus.in/sanger-viewer/blog/`
   - Preserve canonical trailing slashes.

5. **Capture `public/og-image.png` from the real built app**
   - Build the app before capture.
   - Start `vite preview` on a local loopback port and open `/sanger-viewer/` with Chromium through the existing Playwright installation.
   - Set a 1200×630 viewport, reduced motion, and a deterministic color scheme.
   - Wait for the bundled `sample.ab1` load status.
   - Verify `[data-testid="chromatogram-canvas"]` is visible and has non-uniform pixel content, following the existing UX-gallery genuineness guard.
   - Ensure the viewport visibly contains both Sanger Viewer branding and the chromatogram.
   - Capture the viewport directly to `public/og-image.png`; verify its PNG signature and exact 1200×630 dimensions.
   - Stop the preview server and avoid committing temporary capture files.

6. **Verify build output and metadata locally**
   - Rebuild after all assets exist.
   - Assert `dist/index.html` contains a non-empty description plus exact `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, Twitter card, and canonical values.
   - Assert `dist/og-image.png`, `dist/robots.txt`, and `dist/sitemap.xml` exist and are non-empty.
   - Parse the sitemap as XML and compare its two `<loc>` values to the production URLs.
   - Serve the built output with `vite preview`; use `curl --fail` against `/sanger-viewer/`, `/sanger-viewer/robots.txt`, `/sanger-viewer/sitemap.xml`, and `/sanger-viewer/og-image.png`.
   - Confirm the image response has an image content type and the HTML response exposes all required metadata.

7. **Run the complete repository gate**
   - Run `npm run lint`.
   - Run `npm run typecheck`.
   - Run `npm run test`.
   - Run `npm run test:e2e`.
   - Run `npm run perf:smoke`.
   - Run `npm run build`.
   - Do not skip, relax, or delete tests. Record verbatim output in the implementation handoff/PR.
   - Scan every changed implementation file for secrets and run code review plus CodeQL validation before finalizing.

8. **Commit and prepare the implementation PR**
   - Keep the implementation commit file-scoped.
   - Use a Conventional Commit message.
   - Include `unit-id: 596e81bf-a756-4edc-b204-8e9e571769bc` as a commit trailer and on its own line in the PR body.
   - State the strict-scope test-file conflict and the assumption that built-output assertions plus the existing full suite are the permitted substitute.
   - Do not claim production acceptance until deployment checks pass.

9. **Verify externally after merge and Pages deployment**
   - `curl --fail https://animesh.kundus.in/sanger-viewer/` and assert the response contains `og:title`, `og:description`, `og:image`, `twitter:card`, and the standard meta description.
   - `curl --fail https://animesh.kundus.in/sanger-viewer/robots.txt`.
   - `curl --fail https://animesh.kundus.in/sanger-viewer/sitemap.xml`.
   - Fetch the exact `og:image` URL from the deployed HTML with `curl --fail`, verify an HTTP 200 image response, and verify 1200×630 dimensions.
   - Confirm CI's `test` job is green on `ubuntu-latest`.
   - If deployment is not available from the implementation branch, leave these checks explicitly pending for the merge/deploy owner.

## Acceptance-criterion mapping

| Criterion | Reproducible verification |
| --- | --- |
| Live HTML exposes description and required social tags | Fetch production HTML with `curl --fail` and inspect exact tag names/content. |
| Canonical production URL is declared | Inspect the deployed HTML's canonical link and compare it exactly to the supplied URL. |
| `robots.txt` returns 200 and names the sitemap | Fetch it from production and compare the `Sitemap:` line. |
| `sitemap.xml` returns 200 and contains home plus `/blog/` | Fetch and XML-parse it; compare the complete `<loc>` set. |
| Social image is genuine, branded, 1200×630, and returns 200 | Capture from the built app only after sample-load and non-blank-canvas checks; inspect dimensions locally, then fetch the deployed `og:image` URL. |
| CI `test` job remains green | Confirm the GitHub Actions job passes all six project commands on `ubuntu-latest`. |

## Key risks and mitigations

- **Wrong base path:** Exercise `/sanger-viewer/` under `vite preview` and use absolute metadata URLs.
- **Blank or synthetic social image:** Gate capture on the real bundled AB1 load and non-blank chromatogram pixels.
- **Incorrect image dimensions:** Capture at exactly 1200×630 and inspect the resulting PNG dimensions.
- **Crawler cache:** Verify origin responses first; note that social-card cache refresh may lag deployment.
- **Malformed sitemap:** Parse XML and compare the complete URL set before commit.
- **Scope conflict with test requirement:** Do not violate strict file scope; disclose the conflict and use direct built-output/runtime assertions plus the unchanged full suite.
- **Deployment timing:** Separate local/CI proof from post-deploy HTTP proof and leave external checks pending until the custom domain serves the merged commit.

## Related material

- Research: [`../research/2026-07-13-add-social-seo-discoverability-to-the-deployed-site-tracking.md`](../research/2026-07-13-add-social-seo-discoverability-to-the-deployed-site-tracking.md)
- Tracking issue: #55

