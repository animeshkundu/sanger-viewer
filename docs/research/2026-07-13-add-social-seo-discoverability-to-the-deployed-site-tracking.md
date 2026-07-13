# Social and SEO discoverability research

- **Date:** 2026-07-13
- **Owner:** @animeshkundu
- **Tracking issue:** #55
- **Work unit:** `596e81bf-a756-4edc-b204-8e9e571769bc`

## Context

The deployed viewer needs crawler metadata and a trustworthy social preview while remaining a fully static, client-side GitHub Pages application. The implementation unit is restricted to `index.html`, files under `public/`, and `vite.config.ts` only when asset handling requires it.

## Findings

### Current document and static assets

- `index.html` currently has only charset, viewport, and title metadata. It has no description, canonical link, Open Graph metadata, Twitter card metadata, or manifest link.
- `public/` currently contains only `sample.ab1`; there is no social image, robots policy, sitemap, manifest, or icon.
- Vite copies files from `public/` into the build output without bundling them. No `vite.config.ts` change should be needed for `og-image.png`, `robots.txt`, or `sitemap.xml`.
- Production builds use the `/sanger-viewer/` base path, while local development uses `/`. Absolute production URLs in metadata avoid base-path ambiguity for crawlers.
- The canonical production origin supplied by the work unit is `https://animesh.kundus.in/sanger-viewer/`.

### Screenshot source

- The bundled `public/sample.ab1` is loaded deterministically by the app and produces a real chromatogram.
- The existing Playwright harness waits for `#status` to contain `Loaded sample.ab1` and targets `[data-testid="chromatogram-canvas"]`.
- `tests/e2e/helpers/ux-gallery.ts` already guards screenshots by measuring canvas luminance variance and rejecting a uniform/blank canvas.
- The existing Playwright config starts the Vite development server. The social image requirement is stricter: capture against the built app. The implementation should therefore build first, serve `dist/` through `vite preview`, and drive that preview with Playwright while reusing the existing readiness and non-blank checks.
- A 1200×630 viewport screenshot can satisfy the required social-card dimensions without introducing image-processing dependencies. The capture should show the app branding and loaded chromatogram, use reduced motion, and avoid transient UI.

### CI and verification

- The CI `test` job runs, in order: install, lint, typecheck, Vitest, Chromium installation, Playwright E2E, performance smoke, and build.
- Existing page E2E coverage verifies the home-to-blog route, but the strict implementation file scope prohibits editing tests.
- Built-output checks can verify that metadata and public assets are emitted at the expected paths without changing files outside the allowed scope.
- External HTTP checks must be repeated after merge and GitHub Pages deployment; a pull-request build cannot prove the production host has deployed the new files.

## Assumptions and decisions

1. Use `Sanger Viewer` as `og:title` and a concise description emphasizing local, browser-native viewing of AB1/SCF chromatograms, base calls, and quality scores.
2. Use absolute production URLs for canonical, `og:url`, and `og:image`; use `https://animesh.kundus.in/sanger-viewer/og-image.png` for the image.
3. Include `og:type=website` and `twitter:card=summary_large_image`. Twitter title/image tags are not required because the acceptance criteria request only the card tag and Open Graph values provide social fallback.
4. Include exactly the home page and `/blog/` in the sitemap, both as canonical absolute URLs with trailing slashes.
5. Use `User-agent: *`, `Allow: /`, and an absolute `Sitemap:` URL in `robots.txt`.
6. Skip the optional manifest and icons to keep the unit focused and avoid introducing unrequested assets.
7. Do not modify `vite.config.ts` unless a build demonstrates that Vite fails to copy the public assets.
8. The strict file scope takes precedence over the generic requirement to add a new test file. No test source may be changed; acceptance-specific assertions will instead inspect the built HTML/assets and exercise them through the existing Playwright and CI suites. This conflict should be called out in the eventual PR rather than hidden.
9. The broader mission criteria for README, changelog/learnings, and community health belong to parallel units and are explicitly outside this unit's file scope. This unit will not claim to have delivered those unrelated criteria.

## Risks

- Social crawlers cache previews, so a successful deployment may not immediately refresh an old card.
- A screenshot can be the correct size but still be blank or capture a loading state; readiness and canvas-pixel checks are required before capture.
- Vite preview must be requested at `/sanger-viewer/`, not `/`, to exercise the production base path.
- Production checks depend on the custom domain and Pages deployment completing successfully after merge.
- XML syntax or URL drift can make a sitemap fetchable but invalid; parse it and compare all `<loc>` values.

## Sources

- `index.html`
- `vite.config.ts`
- `package.json`
- `playwright.config.ts`
- `tests/e2e/site-pages.e2e.test.ts`
- `tests/e2e/ux-gallery.e2e.test.ts`
- `tests/e2e/helpers/ux-gallery.ts`
- `.github/workflows/ci.yml`
- Tracking issue #55

## Follow-ups

- Implementation plan: [`../plans/2026-07-13-add-social-seo-discoverability-to-the-deployed-site-tracking.md`](../plans/2026-07-13-add-social-seo-discoverability-to-the-deployed-site-tracking.md)
- After deployment, verify the live URLs and metadata independently with `curl`.

