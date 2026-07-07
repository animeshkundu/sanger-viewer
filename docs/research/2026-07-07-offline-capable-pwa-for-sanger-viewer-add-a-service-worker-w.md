# Offline-capable PWA for sanger-viewer — research and findings

Date: 2026-07-07  
Work unit: Offline-capable PWA for sanger-viewer: add a service worker + web manifest so the app loads and works fully offline after first visit.  
Controller correlation marker: `ab52ef08-674c-40ad-9636-48d2ac4dc25b`

## Scope boundary

This work unit should be small and independently shippable. It should add installability/offline capability while preserving the current client-side-only architecture and every existing trace-viewing feature. It should not rework the broader UI wave or replace the full competitor-gap benchmark effort; it should ground its UX claims in the existing design research, UX gallery, and current app behavior, then add PWA-specific evidence and tests.

## Current repository findings

### App shell and base path

- `vite.config.ts` sets `base` to `/` in dev and `/sanger-viewer/` for built pages, so all manifest/service-worker URLs must be base-path safe for GitHub Pages.
- Vite emits only HTML entries explicitly listed in `build.rollupOptions.input`; adding a devlog HTML page requires a matching input entry and a `blog/index.html` link.
- `index.html` currently has no manifest link or PWA meta tags.
- `src/main.ts` is the app entry point and currently only imports CSS, creates the trace viewer, and appends it to `#app`.

### Trace loading path

- The app auto-loads `sample.ab1` on first run via `queueMicrotask(() => void loadSample())` in `src/components/TraceViewer.ts`.
- `loadSample()` constructs the URL from `import.meta.env.BASE_URL`, fetches `${BASE_URL}sample.ab1`, converts it to an `ArrayBuffer`, and parses it in a Vite worker import (`../workers/parser.worker?worker`).
- Local user files use `File.arrayBuffer()` and `parseInWorker()`, so local parse/render does not require network once the app shell and worker bundle are cached.
- Existing UI already has strong first-run affordances: private-by-default empty-state copy, one-click sample data, loading/error/success banners, and a sample ribbon.

### Service worker implications

- A service worker must cache enough of the production build to satisfy “loads and works fully offline after first visit.” Caching only `index.html` and `sample.ab1` is not sufficient because built JS/CSS/worker files are content-hashed.
- Avoid adding a dependency unless necessary. A small vanilla service worker can derive its GitHub Pages scope from `self.registration.scope`, fetch the app shell during `install`, parse the built HTML for same-origin asset URLs, cache those hashed assets, and cache known public assets (`sample.ab1`, manifest, icons).
- Runtime caching should cover same-origin GET requests for script/style/worker/image/manifest/document assets so future built assets and devlog/static pages are captured opportunistically.
- Navigation fallback should serve the cached app shell while offline, but should not mask online errors for non-navigation asset requests.
- Cache versioning must be explicit and activation should delete older `sanger-viewer-*` caches to avoid stale assets.

### E2E testing implications

- Existing Playwright config serves Vite dev on port 4173. A real PWA/offline test should run against a production build/preview because the production HTML contains the hashed bundle references that need to be cached.
- Add a dedicated PWA Playwright config or script that builds once, serves `vite preview` on a separate port, and runs only the offline PWA spec. Keep the default E2E suite from accidentally running the PWA spec against the dev server.
- The offline test should use a persistent browser context or normal context with service workers enabled, wait for `navigator.serviceWorker.ready`, verify a controller after reload if needed, then set `context.setOffline(true)`, reload, and assert the sample trace renders via `[data-testid="chromatogram-canvas"]` non-blank pixel variance.
- Add negative/error-path coverage that would fail without the service worker: after going offline, route/observe failed network is not enough; use browser offline mode and reload the app, then assert status `Loaded sample.ab1` and non-blank canvas.
- Add installability basics checks through Playwright: manifest link exists, manifest fetch succeeds, required fields are present (`name`, `short_name`, `start_url`, `scope`, `display`, `icons`), icons fetch successfully, and service worker registration exists with the expected scope.

### UX gallery/devlog requirements

- `npm run ux:gallery` captures desktop, tablet, and narrow-mobile state matrices across light/dark themes and generates `ux-gallery-screenshots/index.html`.
- The PR template expects a written UX assessment and notes whether `vite.config.ts` and `blog/index.html` were updated for devlog entries.
- The PWA work should update the devlog with an offline/readiness entry and a written “is this great UX / what to improve” assessment. If visible UI is added, the UX gallery must be reviewed for light/dark, desktop/tablet/mobile, and focus states.

## Competitor and product-positioning context

Existing repository research already benchmarks leading Sanger-trace tools and adjacent needs:

- `blog/2026-07-04-v17-design-research/index.html` documents competitor-grounded design research across Chromas, FinchTV, SnapGene, UGENE, Geneious, and Benchling.
- `blog/2026-07-05-v28-ux-gallery/index.html` documents the automated current-state UX gallery gate.
- `docs/research/next-killer-features.md` captures a competitor/product research wave and explicitly preserves a default local/private browser workflow.

PWA-specific differentiation for this work unit:

| Tool | Offline/install posture relevant to this work | Gap sanger-viewer can exploit |
|---|---|---|
| SnapGene | Desktop product with paid/pro viewer modes; installed local app experience. | Match “works without upload” and add browser zero-install + offline-after-first-visit convenience. |
| Benchling | Cloud platform positioning; collaboration-first workflows. | Preserve private local file analysis and make offline reload possible where cloud tools cannot help. |
| Chromas | Installed Windows desktop freeware/pro split. | Offer cross-platform browser access with no installer and offline repeat visits. |
| FinchTV | Legacy desktop viewer experience. | Keep browser-native UI, current accessibility, and offline app-shell resilience without legacy install friction. |
| ApE | Installed plasmid/sequence editor style workflow. | Complement install-free trace viewing with PWA installability basics for repeat lab use. |

The PWA should therefore emphasize: private-by-default, zero upload, works after first visit, no server dependency for local files, and no loss of power-user features.

## Abandoned PR #50 findings

PR #50 (“Add private-by-default offline PWA proof”) is an open draft with one commit on a different branch. Its body says it attempted to add a web manifest, SVG icon, same-origin service worker, offline reload coverage, and a privacy/offline badge. The draft checklist was not complete: lint/typecheck/test, E2E, UX gallery, CI, and accessibility measurements were unchecked.

Lessons for this scoped implementation:

- Do not ship static “offline-ready” copy unless it reflects actual service-worker readiness.
- Keep the offline scope separate from broad privacy-affordance redesign to avoid merge conflicts and time-budget creep.
- Make the E2E test prove a real offline reload renders a trace, not only that registration exists.
- Keep all URLs base-path safe for `/sanger-viewer/` GitHub Pages deployment.

## Key risks

1. **Hashed assets not cached:** production chunks and worker bundles may be missed if the service worker only precaches fixed paths. Mitigation: install-time app-shell parsing plus runtime same-origin asset caching.
2. **First-visit semantics:** a newly installed service worker may not control the first page. Mitigation: test the intended user journey as “visit online, wait for SW ready, reload offline” and ensure install precache includes built assets.
3. **GitHub Pages base path:** wrong `start_url`, `scope`, or asset paths can work locally and fail when deployed under `/sanger-viewer/`. Mitigation: derive URLs from service-worker scope and use relative manifest values where possible.
4. **Dev server vs production preview:** Vite dev module graph is not the same as production build. Mitigation: add a PWA-specific Playwright preview config rather than relying on the existing dev-server E2E config.
5. **Stale cache/update bugs:** old caches can serve stale chunks after deploy. Mitigation: version cache names and delete old `sanger-viewer-*` caches during activation.
6. **Over-broad request handling:** service worker must not cache external URLs, POST bodies, downloads, or user trace data. Mitigation: only handle same-origin GET requests; local files never become request bodies.
7. **Accessibility/UX overclaim:** an offline indicator can mislead users if shown too early. Mitigation: show readiness only after `navigator.serviceWorker.ready`, or avoid adding visible UI beyond manifest metadata if the PR owner wants an infrastructure-only slice.

## Recommended implementation shape

- Add `public/sw.js` as a dependency-free service worker.
- Add `public/site.webmanifest` and icon assets under `public/icons/`.
- Add a small `src/pwa.ts` registration module and import it from `src/main.ts`.
- Add manifest/theme meta tags to `index.html`.
- Add `tests/e2e/offline-pwa.e2e.test.ts` plus a production-preview Playwright config/script so the E2E test runs against built assets.
- Add a devlog entry and wire it into `vite.config.ts` and `blog/index.html`.
- Optionally add a tiny readiness status using existing status-banner/design tokens, but only if the implementation can truthfully show it after service-worker readiness.

## Verification summary for the implementation PR

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `npm run test:e2e` includes the PWA offline spec or CI has an explicit PWA E2E step.
- `npm run perf:smoke` passes with no budget regression.
- `npm run ux:gallery` passes and generated screenshots are reviewed with a written UX assessment.
- Offline proof: after one online visit to production preview, browser offline reload still reaches `Loaded sample.ab1` and renders a non-blank chromatogram canvas.
- Installability basics: manifest link, manifest required fields, icon fetches, service-worker registration/scope, and HTTPS/localhost-compatible registration path are asserted.
