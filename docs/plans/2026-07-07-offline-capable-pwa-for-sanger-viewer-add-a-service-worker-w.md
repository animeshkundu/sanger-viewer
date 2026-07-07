# Implementation plan — offline-capable PWA for sanger-viewer

Date: 2026-07-07  
Work unit: Offline-capable PWA for sanger-viewer: add a service worker + web manifest so the app loads and works fully offline after first visit.  
Controller correlation marker: `ab52ef08-674c-40ad-9636-48d2ac4dc25b`

## Branch and commit requirements

- Use a branch name containing `ab52ef08-674c-40ad-9636-48d2ac4dc25b`.
- Put `ab52ef08-674c-40ad-9636-48d2ac4dc25b` on its own line in the PR body.
- Include the first implementation commit trailer:
  - `unit-id: ab52ef08-674c-40ad-9636-48d2ac4dc25b`
- Do not add tool/generated-authorship attribution anywhere.

## Files to change

### PWA infrastructure

1. `index.html`
   - Add `link rel="manifest"` using a base-path-safe URL.
   - Add `theme-color`, app description, and mobile web app meta tags as appropriate.
   - Keep existing header/nav and script entry intact.

2. `public/site.webmanifest`
   - Add `name`, `short_name`, `description`, `start_url`, `scope`, `display`, `background_color`, `theme_color`, and icon entries.
   - Use relative values that work under both localhost and `/sanger-viewer/`.

3. `public/icons/*`
   - Add installability icons, preferably maskable + any-purpose sizes expected by browser installability checks.
   - Keep icons static and lightweight.

4. `public/sw.js`
   - Add a vanilla same-origin service worker.
   - During `install`, derive scope from `self.registration.scope`, cache the app shell, manifest, icons, `sample.ab1`, and same-origin hashed assets discovered from the built app shell HTML.
   - During `activate`, delete old `sanger-viewer-*` caches and claim clients only after the new cache is ready.
   - During `fetch`, handle only same-origin `GET` requests.
   - Use navigation fallback to cached app shell when offline.
   - Use cache-first or stale-while-revalidate behavior for scripts/styles/workers/images/manifests/sample data without caching user-provided local files.
   - Never cache non-GET requests, external requests, request bodies, or downloads.

5. `src/pwa.ts`
   - Register the service worker when supported and running in a secure context or localhost.
   - Use `import.meta.env.BASE_URL` to build a base-path-safe service-worker URL.
   - Dispatch a small custom event or expose a simple callback only if needed for readiness UI/tests.
   - Fail silently or log minimally without surfacing noisy errors to users.

6. `src/main.ts`
   - Import the PWA registration after the app is created.
   - Do not delay initial render on service-worker registration.

### Optional visible readiness affordance, only if kept truthful

7. `src/components/TraceViewer.ts` and `src/style.css`
   - If adding a visible offline readiness message, reuse existing status-banner/design tokens.
   - Show “Offline-ready for future visits” only after `navigator.serviceWorker.ready` or equivalent readiness signal.
   - Keep it non-blocking, screen-reader sensible, and visually checked in light/dark/narrow-mobile.
   - If no visible UI is added, document in the devlog that the feature is infrastructure-level and verified by E2E/installability tests.

### E2E and validation

8. `playwright.pwa.config.ts` or equivalent
   - Add a production-preview Playwright config that runs `npm run build` then `npm run preview -- --host 127.0.0.1 --port <pwa-port>`.
   - Restrict this config to the offline PWA spec.
   - Keep the default `playwright.config.ts` from accidentally running the PWA spec against the Vite dev server, or make the package script orchestrate the two configs explicitly.

9. `package.json`
   - Add a script such as `test:pwa` for the production-preview offline spec.
   - Ensure `npm run test:e2e` or CI runs the new PWA E2E test so acceptance is not optional.

10. `.github/workflows/ci.yml`
    - If `npm run test:e2e` does not include the PWA test, add an explicit CI step for `npm run test:pwa`.
    - Preserve existing lint/typecheck/unit/E2E/perf/build/UX-gallery gates.

11. `tests/e2e/offline-pwa.e2e.test.ts`
    - Test installability basics: manifest link exists; manifest fetch succeeds; required fields are present; icon URLs fetch; service worker registration exists and has expected scope.
    - Test offline reload: first online visit loads `sample.ab1`; wait for service worker readiness; reload if needed until controlled; set browser context offline; reload; assert `#status` contains `Loaded sample.ab1`; assert `[data-testid="chromatogram-canvas"]` is non-blank using the existing pixel-variance style check.
    - Test local-file parse/render offline after app shell is cached: after service worker is ready, set browser offline, use `setInputFiles` with `fixtures/ab1/310.ab1`, assert loaded status and non-blank canvas.
    - Include an error-path assertion where a missing uncached same-origin asset does not get falsely reported as a successful trace load, if practical without overfitting.

### Devlog, docs, and durable learnings

12. `blog/2026-07-07-v31-offline-pwa/index.html`
    - Add a devlog entry explaining offline-after-first-visit behavior, private local parsing, installability basics, tests added, UX assessment, and known limits.
    - Include “is this great UX?” and “what to improve next” sections.

13. `blog/index.html`
    - Add the new devlog entry at the top.

14. `vite.config.ts`
    - Add the new devlog HTML file to `build.rollupOptions.input`.

15. `CHANGELOG.md`
    - Add an Unreleased entry for offline-capable PWA support.

16. `LEARNINGS.md`
    - Add a short learning about PWA/offline testing needing production preview and base-path-safe service-worker scope if the implementation confirms it.

## Step-by-step implementation sequence

1. Create the manifest and icons.
2. Add `index.html` manifest/meta wiring.
3. Add the service worker with install-time app-shell parsing, same-origin-only GET fetch handling, navigation fallback, and versioned cache cleanup.
4. Add `src/pwa.ts` registration and import it from `src/main.ts` without blocking render.
5. Add the production-preview PWA Playwright config and package script.
6. Add the offline/installability E2E spec.
7. Wire the new PWA test into `npm run test:e2e` or CI.
8. Run the new PWA E2E spec and fix service-worker scope/cache misses.
9. Run existing `npm run test:e2e` to prove the default desktop/tablet/narrow-mobile coverage still passes.
10. Run unit/static gates: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run perf:smoke`, `npm run build`.
11. Run `npm run ux:gallery`, inspect the generated gallery, and write the UX-quality review in the devlog/PR body.
12. Update devlog, blog index, Vite input, changelog, and learnings.
13. Re-run any affected gates after docs/config changes.
14. Scan changed files for secrets before committing.
15. Run parallel validation before final handoff.

## Acceptance-criteria verification matrix

### 1) COMPETITOR-BENCHMARKED

- Verify the PR cites existing competitor/design research and this PWA research artifact.
- Confirm the PWA-specific competitor gap is documented: browser zero-install + offline-after-first-visit + private local parsing compared with installed desktop tools and cloud-first tools.
- Confirm the broader refreshed competitor-gap assessment exists or explicitly report it as an upstream dependency if it is not part of this small PWA PR.
- Confirm the UX gallery is regenerated and reviewed for this PR.

### 2) FRICTIONLESS FIRST RUN

- E2E: first online visit auto-loads and renders `sample.ab1`.
- E2E: offline reload after first visit still auto-loads and renders `sample.ab1`.
- E2E: offline local file input still parses and renders `fixtures/ab1/310.ab1` with no network.
- Manual/UX-gallery review: empty-state/dropzone, loading, error, and sample states remain clear.

### 3) COHESIVE DESIGN SYSTEM

- If visible UI is added, verify it reuses existing status-banner/design tokens in light/dark/narrow-mobile.
- If no visible UI is added, verify no fragmented styles were introduced.
- UX gallery review must explicitly check the new/offline-related state or confirm no visual state changed.

### 4) DELIGHT

- Verify offline readiness does not block initial render.
- If readiness UI exists, verify it appears only after real readiness and uses tasteful existing motion/status patterns.
- Written UX review answers whether the offline capability improves user confidence without noise.

### 5) ACCESSIBILITY

- E2E/installability UI checks should not introduce non-keyboard controls.
- If readiness UI exists, verify ARIA semantics (`role="status"` or equivalent) and contrast/focus behavior in the UX gallery.
- Existing a11y/touch E2E coverage must continue to pass.

### 6) PERFORMANCE

- Run `npm run perf:smoke` and compare no regression against existing budgets.
- Confirm service-worker registration does not delay app render or parser worker startup.
- Confirm no large trace/user file bytes are placed in Cache Storage.

### 7) POWER PRESERVED

- Run the full E2E suite so editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace workflows remain covered.
- Run unit tests for parser/core/export/workspace behavior.
- Confirm service-worker fetch handling does not intercept downloads or local `File` parsing.

### Every PR gate

- CI: lint, typecheck, unit tests, E2E, PWA E2E, perf smoke, build, and UX-gallery should pass.
- Screenshot gate: `npm run ux:gallery` should generate all required state × theme × viewport captures.
- Devlog: new entry should document behavior, tests, UX review, and limitations.
- Security: secret scan changed files; run parallel validation; verify same-origin GET-only service worker behavior.

## Edge cases to handle

- First visit installs service worker but page is not yet controlled.
- Offline navigation to `/sanger-viewer/` and localhost preview root.
- Offline hashed JS/CSS/worker asset fetches.
- Missing or failed `sample.ab1` cache.
- Service-worker unsupported browsers.
- Cache upgrade after a new deploy.
- External links/devlog navigation should not be cached as app assets.
- Download/export actions should continue to produce local blobs, not cached network responses.

## Definition of Done for implementation handoff

- Full command output is pasted verbatim for all required commands.
- Tests fail without the service-worker/manifest behavior and pass with it.
- No tests are skipped, stubbed, or weakened to pass.
- Every acceptance criterion above is verified one-by-one.
- Any blocker or scoped-out global criterion is stated explicitly.
- Docs/devlog/changelog/learnings are updated.
