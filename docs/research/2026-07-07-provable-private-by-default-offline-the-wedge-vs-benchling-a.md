# Provable private-by-default + offline wedge vs Benchling

Date: 2026-07-07  
Owner: @animeshkundu  
Controller correlation marker: b568cb5c-bf82-4287-bb27-52612947cabf

## Context

This work unit should make the privacy/offline differentiator provable, visible, and regression-tested:

- trace and sequence bytes must never leave the browser during parse → align → export flows;
- the UI must clearly state that analysis runs entirely in the browser and nothing is uploaded;
- the app must work after first load with the network disconnected via PWA/service worker;
- the change must remain client-side only and preserve existing trace viewing, editing, export, alignment, assembly, primer/Tm, permalink, and multi-trace behavior.

## Repository findings

### Existing private-by-default foundation

- The app is client-side TypeScript/Vite. The browser entry point only mounts `createTraceViewer()` from `src/main.ts`.
- Local file loading uses `File.arrayBuffer()` followed by a Vite worker import for parser execution in `src/components/TraceViewer.ts`; local files are not uploaded as part of the current load path.
- The bundled sample path is the only intentional trace-byte fetch found in the viewer: `loadSample()` fetches `${import.meta.env.BASE_URL}sample.ab1` from `public/sample.ab1`.
- Reference alignment, variant calling, contig assembly, consensus, primer/Tm, and exports are implemented in local modules and UI event handlers rather than backend calls.
- Existing privacy copy already appears in:
  - empty state: “Your sequencing trace opens entirely in-browser — nothing is uploaded.”
  - sample ribbon: “100% in-browser, nothing uploaded”
  - share note: links are generated in-browser and local files require reattaching the source trace.

### Gaps for this work unit

- There is no `manifest.webmanifest`, service worker, or service-worker registration, so offline reload is not guaranteed.
- The privacy promise is present but not a persistent, app-level affordance; once a trace is loaded, it can be missed outside the sample ribbon/share panel.
- There is no CI test that proves trace or derived sequence bytes are absent from network payloads.
- There is no offline E2E test that installs/warms the PWA cache, disconnects the network, reloads, and verifies app shell + sample trace rendering.
- The UX gallery currently captures empty/loading/loaded/sidebar/export/focus/tooltip states but not the privacy/offline affordance as an explicit screenshot-gated state.
- The devlog index and Vite Rollup inputs require manual updates for each new devlog page.

## Competitor/privacy positioning relevant to this wedge

The existing research in `docs/research/next-killer-features.md` and the v30 devlog identifies Benchling as a cloud-based collaborative platform and states the wedge clearly: once this app is loaded from its hosted origin, file analysis can stay local in the browser. This work unit should turn that claim into testable product evidence:

- **Benchling / cloud tools:** account-backed, cloud collaboration is powerful but implies uploaded or remotely managed data for normal use. The wedge is a visible local-only trace analysis mode with a hard test that fails if trace/sequence bytes are sent.
- **ICE/TIDE/DECODR-style upload tools:** upload-based analysis creates confidentiality and network-dependence friction. The wedge is parse, align, review, and export without network payloads containing trace or sequence data.
- **Desktop tools (SnapGene, Chromas, FinchTV, ApE):** desktop/private operation can be strong, but install/platform friction remains. The wedge is private-by-default plus zero-install plus offline reload after first visit.

## Implementation implications

- Prefer a minimal, auditable PWA implementation with static files in `public/`:
  - `public/manifest.webmanifest`
  - `public/sw.js`
- Register the service worker from `src/main.ts` only when `serviceWorker` is available.
- Keep the service worker same-origin only, cache app shell/assets/sample data, and avoid introducing analytics, telemetry, or remote calls.
- Add a persistent privacy/offline badge near the front door/app shell using existing design tokens and status-banner/card styles instead of a parallel style system.
- Add a Playwright E2E spec that:
  1. sets up a network spy before any user trace is loaded;
  2. loads a real fixture through `setInputFiles`;
  3. runs reference alignment;
  4. triggers at least one export download;
  5. inspects every request body for raw fixture bytes and derived sequence windows;
  6. allowlists same-origin static `GET` requests and the bundled `sample.ab1` fetch while still failing any request body carrying trace/sequence content.
- Add a second Playwright E2E path that warms the service worker/cache online, switches the browser context offline, reloads, and verifies the app shell plus cached sample chromatogram render.
- Update UX gallery state coverage so the privacy/offline affordance is screenshot-gated in both light and dark and across configured viewports.
- Add a devlog entry and Vite config input so the entry is included in production builds.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Service worker caching conflicts with GitHub Pages base path `/sanger-viewer/` | Derive scope-relative URLs from `self.registration.scope`; test in production preview/build path when possible. |
| Vite dev server module graph makes offline E2E flaky | Warm the cache after service worker activation; if needed, run offline assertions against `npm run build` + `npm run preview` behavior rather than relying on uncached dev modules. |
| Privacy test misses encoded sequence payloads | Check raw binary byte windows, full fixture hash where observable, plain sequence, and representative sequence substrings in request bodies; fail on any non-empty suspicious request payload outside static asset/sample GETs. |
| False positives from legitimate sample fetch | Treat `GET /sample.ab1` as allowed only because it is bundled sample data, never user-provided trace bytes. |
| Offline cache serves stale old assets | Version the cache name and delete older app caches on activation. |
| UI affordance fragments the design system | Reuse existing status-banner/control/card tokens and dark-mode variables from `src/style.css`. |
| Power-feature regression | Run existing unit, E2E, perf, UX-gallery, typecheck, lint, and build commands; do not alter parser/alignment/export logic except for tests and affordance wiring. |

## Acceptance verification map

- **Provable no-upload:** new E2E network-mock assertion fails on any network request body containing trace/sequence bytes across parse → align → export.
- **Visible affordance:** Playwright and UX-gallery assertions verify the persistent “runs entirely in your browser — nothing is uploaded” affordance.
- **Offline-capable:** new E2E test verifies service worker readiness, offline reload, and cached sample render.
- **Client-side only:** implementation adds static PWA files and browser registration only; no backend or telemetry.
- **Screenshot-gate + devlog:** `npm run ux:gallery` captures the new privacy/offline state; blog entry documents what changed and the written UX review.
- **Power preserved:** existing E2E/unit/perf suites exercise editing, export, alignment, assembly, primer/Tm, permalinks, multi-trace, rendering, and parser behavior.

