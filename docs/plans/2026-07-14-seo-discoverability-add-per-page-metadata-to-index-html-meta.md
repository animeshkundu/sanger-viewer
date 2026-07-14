# SEO, discoverability, and supply-chain implementation plan

Date: 2026-07-14  
Controller marker: `unit-id: 75633fb8-fdf6-4eb4-892b-5b03ddb6f5a1`

## Goal and assumptions

Deliver a crawlable, preview-ready project landing page; static proof of the
deployed commit; and repository-native dependency and security scanning without
changing the client-only architecture, privacy posture, Vite
`/sanger-viewer/` production base, or Pages deployment model.

Assumptions:

- Complete landing-page metadata is the scoped meaning of “per-page metadata”;
  the existing devlog pages are included in discovery via the sitemap but are
  not all rewritten.
- The broken formatting in acceptance criterion 3 denotes a canonical link and
  meta description.
- The existing custom-domain configuration remains authoritative.
- `@animeshkundu` is the repository-wide CODEOWNER.

## Step-by-step changes

### 1. Add the landing-page metadata

Change `index.html` only within `<head>`:

- Add a concise search description and `theme-color`.
- Add the exact self-referential canonical URL
  `https://animesh.kundus.in/sanger-viewer/`.
- Add `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, and
  `og:site_name`; use the absolute 1200 by 630 PNG URL and include image
  dimensions/alt text as supporting Open Graph fields.
- Add `twitter:card=summary_large_image`, title, description, image, and image
  alt metadata.
- Add favicon, scalable icon, and Apple touch icon links whose hrefs preserve
  the production project base.
- Add one valid inline `application/ld+json` `SoftwareApplication` object with
  canonical URL, browser platform, application category, description, and MIT
  license.

Keep all metadata static in view-source. Do not add tracking, remote scripts,
analytics, or runtime metadata mutation.

### 2. Add crawlable visual and crawler assets

Create:

- `public/og-image.png` — exactly 1200 by 630 pixels, on-brand chromatogram
  artwork, readable title, and useful alt-text counterpart in metadata.
- `public/favicon.svg` — scalable product mark.
- `public/favicon.ico` — conventional browser fallback.
- `public/apple-touch-icon.png` — exactly 180 by 180 pixels.
- `public/sitemap.xml` — absolute canonical URLs for the app root, blog index,
  and every current blog entry listed in `vite.config.ts`.
- `public/robots.txt` — allow crawling and include
  `Sitemap: https://animesh.kundus.in/sanger-viewer/sitemap.xml`.

Use existing system image tooling during implementation and inspect generated
files; do not add a runtime or package dependency solely to create static
artwork.

### 3. Stamp the deployed commit

Update `.github/workflows/deploy-pages.yml`:

- Preserve all triggers, permissions, concurrency, build, artifact upload, and
  deploy steps.
- Insert one named step after `npm run build` and before artifact upload that
  writes the exact `GITHUB_SHA` to `dist/BUILD_SHA.txt` with one trailing
  newline.
- Avoid fallback values: a missing SHA should fail rather than publish an
  unverifiable artifact.

### 4. Add supply-chain configuration and ownership

Create:

- `.github/dependabot.yml` with version 2 configuration, weekly npm updates from
  `/`, weekly GitHub Actions updates from `/`, explicit `main` target, and
  bounded open-PR limits.
- `.github/workflows/codeql.yml` with least-privilege permissions and
  JavaScript/TypeScript analysis for pull requests, pushes to `main`, and a
  weekly schedule. Use the supported CodeQL action major and a normal repository
  build so analysis is uploaded rather than merely initializing.
- `.github/CODEOWNERS` with a repository-wide `@animeshkundu` rule.

Keep CodeQL additive: do not alter or weaken `.github/workflows/ci.yml`.

### 5. Add focused regression coverage

Extend `tests/e2e/site-pages.e2e.test.ts`, following
`.github/instructions/tests.instructions.md`:

- Assert the exact meta description, canonical, theme color, all required Open
  Graph fields, Twitter large-image fields, and icon hrefs from the page head.
- Parse the JSON-LD text as JSON and assert its schema type, canonical URL,
  application properties, and license rather than only checking that a script
  exists.
- Fetch `og-image.png`, favicon assets, `sitemap.xml`, and `robots.txt`; require
  successful responses and appropriate content types/text.
- Decode the social and Apple images in-browser and assert exact natural
  dimensions, preventing an HTML fallback or malformed image from passing.
- Assert robots names the absolute sitemap and the sitemap contains absolute,
  canonical app/blog URLs without localhost or relative locations.

These tests fail on the current branch because every asserted head element and
public asset is absent. Keep the existing devlog navigation scenario intact.
Do not stub, skip, relax, or delete existing coverage.

### 6. Update durable project documentation

- Add an `Unreleased` entry to `CHANGELOG.md` for search/social metadata,
  crawler assets, deploy provenance, dependency updates, CodeQL, and ownership.
- Add a concise `LEARNINGS.md` entry documenting that deploy provenance must be
  generated after Vite builds and before Pages artifact upload, and that
  project-path asset URLs need explicit production-base validation.
- Retain these research and plan artifacts for future implementation context.

## Validation sequence

### Local static and automated checks

1. Inspect binary types and dimensions for both PNGs and favicon assets.
2. Run the full local gate and preserve actual verbatim output for handoff:
   `npm run lint`, `npm run typecheck`, `npm run test`,
   `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
3. Build with a known SHA, perform the same post-build stamp locally, serve
   `dist`, and use `curl` against `/sanger-viewer/` to confirm the base-path
   output, metadata source, crawler assets, image headers, and SHA content.
4. Run Lighthouse's SEO category against the production preview with a fixed
   headless-Chrome command. Save the JSON score and record the exact command,
   environment, and score in the implementation PR; require at least 0.90.
5. Secret-scan every changed file, then run repository code review and CodeQL
   validation before final handoff.

### PR and GitHub checks

1. Confirm all existing CI jobs remain green: lint, typecheck, unit tests, E2E,
   performance smoke, build, and UX gallery.
2. Confirm the new CodeQL workflow runs on the PR head, completes successfully,
   and its analyze step uploads JavaScript/TypeScript results. Record reproducible
   `gh api` queries or Actions URLs in the PR.
3. Confirm Dependabot configuration and CODEOWNERS are visible through the
   GitHub contents API.
4. Include the exact controller marker on its own line in the PR body and retain
   it in the branch name. The first planning commit carries the same marker in
   its commit trailer.

### Post-merge and post-deploy acceptance checks

Run only after the Deploy Pages workflow for the current `main` HEAD succeeds:

1. **Social image:** `curl -fsSL` the absolute `og-image.png` URL, inspect its
   image type, and confirm 1200 by 630 dimensions.
2. **Build SHA:** capture `git rev-parse HEAD` from updated `main`; fetch
   `BUILD_SHA.txt` with a random cache-busting query; compare exact trimmed
   values.
3. **View-source metadata:** fetch the landing-page HTML without executing
   JavaScript and verify the exact canonical, description, all six required
   Open Graph fields, absolute social image, Twitter large-image card, icons,
   theme color, and parseable `SoftwareApplication` JSON-LD.
4. **Crawler files:** fetch `sitemap.xml` and `robots.txt` with fail-on-HTTP-error
   behavior; parse the XML and verify robots' absolute `Sitemap:` line.
5. **Lighthouse:** rerun the same SEO-only audit against the deployed URL and
   require a score of at least 0.90.
6. **Supply chain:** query workflow runs/jobs and code-scanning analyses through
   `gh api`; require green CI, green CodeQL with analysis, and successful Pages
   deployment. Fetch Dependabot, CodeQL, and CODEOWNERS paths through the
   contents API.
7. **Regression safety:** verify the deployed HTML and assets remain under
   `/sanger-viewer/`, open the app and devlog routes, and confirm the existing
   Deploy Pages workflow—not a replacement deployment path—published the site.

## Acceptance-criterion traceability

| Criterion | Implemented by | Reproducible proof |
| --- | --- | --- |
| 1. 1200×630 OG image returns 200 | `public/og-image.png`, metadata, E2E decode | `curl`, MIME inspection, dimension inspection |
| 2. Live SHA equals main HEAD | deploy step writing `dist/BUILD_SHA.txt` | cache-busted `curl` compared with `git rev-parse HEAD` |
| 3. Complete source metadata | `index.html` | `curl`/view-source plus JSON-LD parse |
| 4. Sitemap and robots return 200 | `public/sitemap.xml`, `public/robots.txt` | fail-on-error `curl`, XML parse, `Sitemap:` assertion |
| 5. Lighthouse SEO ≥0.90 | metadata and crawler assets | local-preview and deployed SEO reports recorded in PR |
| 6. Dependabot, CodeQL, CODEOWNERS | three `.github` files | contents API and green CodeQL analysis run |
| 7. Existing CI/base/deploy remain intact | surgical workflow/head/assets/tests changes | full local gate, PR checks, deployed route checks |

## Key risks and mitigations

- **Project base regression:** retain `vite.config.ts`; use explicit
  `/sanger-viewer/` metadata URLs; test the built artifact as well as Vite dev.
- **Stale/missing provenance:** stamp after build and before upload; use
  `GITHUB_SHA`; compare only after the matching deploy completes and bypass
  cache.
- **False-positive image tests:** verify MIME type, browser decode, and natural
  dimensions, not only HTTP 200.
- **Sitemap drift:** derive its initial URL inventory from current Vite inputs
  and assert current canonical routes; update it when inputs change.
- **CodeQL without analysis:** use required permissions, execute a supported
  JavaScript/TypeScript build path, verify the analyze/upload step and GitHub
  analysis API.
- **SEO score variance:** audit a production build with a fixed command and
  rerun on the deployed URL; report both exact results rather than claiming an
  unrecorded score.
- **Privacy regression:** keep every addition static and first-party; reject
  analytics, remote fonts, third-party scripts, and telemetry.

## Intentionally deferred

- Broad metadata rewrites for every historical devlog HTML file.
- Search-engine submission or Search Console ownership, which requires external
  account access and is not needed for crawlability.
- Any backend, dynamic sitemap service, telemetry, or runtime supply-chain
  service.

