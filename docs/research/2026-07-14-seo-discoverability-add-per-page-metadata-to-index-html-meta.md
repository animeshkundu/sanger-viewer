# SEO, discoverability, and supply-chain research

Date: 2026-07-14  
Controller marker: `unit-id: 75633fb8-fdf6-4eb4-892b-5b03ddb6f5a1`

## Scope

This research covers the project landing page and the repository controls named
in the work unit. It is intentionally limited to static, client-side assets and
GitHub Actions. No analytics, remote scripts, backend, or runtime network
dependency is needed.

## Current state

- `index.html` has only charset, viewport, and title metadata. It has no
  description, canonical URL, Open Graph data, Twitter card, JSON-LD,
  theme color, or icon links (`index.html:3-7`).
- Production builds use the required `/sanger-viewer/` base while the Vite
  development server uses `/` (`vite.config.ts:4-6`). This must not change.
- Vite has many explicit HTML build inputs for the landing page, blog index,
  and blog entries (`vite.config.ts:7-48`). Files under `public/` are copied to
  the build output, so crawl assets belong there; currently it contains only
  `sample.ab1`.
- Pages deployment builds `dist`, uploads it, and deploys that artifact. There
  is no build-revision file yet (`.github/workflows/deploy-pages.yml:17-43`).
  The SHA stamp must therefore be written after the build and before
  `actions/upload-pages-artifact`.
- Existing CI runs lint, typecheck, Vitest, Playwright E2E, the performance
  smoke test, and the production build on Ubuntu
  (`.github/workflows/ci.yml:13-32`). The UX gallery is a dependent second job
  (`.github/workflows/ci.yml:34-66`).
- The site-pages E2E test currently checks only navigation from the app shell
  to the devlog and one entry (`tests/e2e/site-pages.e2e.test.ts:1-21`).
- Playwright runs Vite's development server at the origin root, not a built
  `/sanger-viewer/` preview (`playwright.config.ts:3-12`). Exact SEO URLs should
  therefore be asserted from DOM attributes and static asset responses rather
  than inferred from the test server URL.
- There is no `.github/dependabot.yml`, `.github/workflows/codeql.yml`, or
  `.github/CODEOWNERS`.
- The repository already has `CHANGELOG.md` and `LEARNINGS.md`; implementation
  should update them when the behavior and durable deployment knowledge change.
- The test instructions require deterministic, independent tests and focused
  assertions (`.github/instructions/tests.instructions.md:8-10`).

## Proposed metadata contract

Use stable, page-specific landing-page values throughout:

- canonical and `og:url`:
  `https://animesh.kundus.in/sanger-viewer/`
- `og:image` and `twitter:image`:
  `https://animesh.kundus.in/sanger-viewer/og-image.png`
- Open Graph type: `website`
- Twitter card: `summary_large_image`
- JSON-LD type: `SoftwareApplication`, with the canonical URL, browser
  application category, operating-system independence, description, and MIT
  license URL. JSON-LD remains inline data and causes no third-party request.

The title and description should be identical or semantically aligned across
HTML, Open Graph, Twitter, and JSON-LD to prevent contradictory previews.

## Static asset approach

- Add a 1200 by 630 PNG social image using the product's existing visual
  language: dark viewer surface, four chromatogram channel colors, concise
  product name, and a privacy/client-side message.
- Add a scalable favicon, a conventional ICO favicon, and a 180 by 180 Apple
  touch icon. Link them with `/sanger-viewer/`-prefixed URLs so both production
  view-source and GitHub Pages project-path routing are explicit.
- Add `sitemap.xml` containing absolute URLs for the landing page, devlog index,
  and every HTML entry currently declared in Vite's build inputs. Omit
  speculative priorities and dates that cannot be maintained accurately.
- Add `robots.txt` that permits crawling and names the absolute sitemap URL.

Binary dimensions and MIME types need direct tests; file existence alone would
not catch an incorrectly sized image or a renamed/non-image response.

## Build provenance approach

The deploy build job exposes `GITHUB_SHA`. Immediately after `npm run build`,
write that exact value plus a trailing newline to `dist/BUILD_SHA.txt`, then
upload the unchanged `dist` directory. This proves which commit produced the
deployed artifact without exposing credentials or introducing runtime code.

The live comparison is meaningful only after the Pages deploy for the current
main HEAD has completed. Use a cache-busting query string because CDN/browser
caches may otherwise serve an older text object briefly.

## Supply-chain controls

- Dependabot should monitor both npm and GitHub Actions on a weekly cadence,
  target `main`, and use bounded open-pull-request limits.
- CodeQL should analyze JavaScript/TypeScript on pull requests, pushes to
  `main`, and a weekly schedule. It needs read-only repository access plus
  `security-events: write`, should use the currently supported CodeQL action
  major, and should run the repository build rather than replacing existing CI.
- `.github/CODEOWNERS` should assign the repository default (`*`) to
  `@animeshkundu`, ensuring all current and future paths have an owner.

## Assumptions and open notes

1. “Per-page metadata” in this work unit means complete metadata for the project
   landing page (`index.html`), because that is the only source file and URL
   explicitly required for metadata assertions. Existing devlog pages will be
   discoverable through the sitemap but will not all receive a broad metadata
   rewrite in this focused change.
2. The malformed acceptance-criterion fragments “a self-referential” and “a”
   are interpreted as requiring a canonical link and meta description, matching
   the explicit work-unit list.
3. The custom domain and `/sanger-viewer/` route are already configured outside
   this repository; no `CNAME` change is in scope.
4. `@animeshkundu` is the intended CODEOWNER because it is the repository owner.
5. Lighthouse evidence belongs in the implementation PR description. The
   report should use a production build served locally before merge, then the
   deployed URL after merge when final live proof is available.
6. The CodeQL action major should be checked against GitHub's supported version
   at implementation time rather than copying an obsolete example.

## Risks

- Root-relative icon or asset paths without `/sanger-viewer/` can work in local
  development but fail after Pages deployment.
- Stamping before the build can be erased when Vite recreates `dist`; stamping
  after artifact upload cannot reach production.
- Comparing `BUILD_SHA.txt` while a newer main commit is queued or deploying can
  produce a legitimate temporary mismatch.
- A sitemap can drift when new Vite HTML inputs are added. E2E coverage should
  at least validate that listed current URLs are absolute and corresponding
  public routes respond.
- CodeQL permissions or unsupported action majors can yield a workflow run
  without uploaded analysis even when compilation succeeds.
- Browser-only image checks must wait for decode and assert natural dimensions,
  otherwise a 200 HTML fallback can masquerade as a valid image.
- Lighthouse results vary if run against the dev server or before the page
  settles; use the production build, a fixed Chrome invocation, and record the
  exact command and JSON score.

