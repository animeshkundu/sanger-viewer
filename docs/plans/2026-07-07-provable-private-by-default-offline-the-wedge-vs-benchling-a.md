# Implementation plan: provable private-by-default + offline wedge vs Benchling

Date: 2026-07-07  
Owner: @animeshkundu  
Controller correlation marker: b568cb5c-bf82-4287-bb27-52612947cabf

## Goal

Ship a small, focused PR that makes the app’s local-only promise visible and test-proven: trace/sequence bytes never leave the browser during parse → align → export, and the app can reload and render the cached sample while offline after first visit.

## Files to change

### App/PWA

- `index.html`
  - Add manifest link and theme-color metadata.
- `src/main.ts`
  - Register the service worker when supported.
  - Keep registration non-blocking so app mount remains instant.
- `public/manifest.webmanifest`
  - Add PWA name, short name, start URL, scope, display mode, colors, and icon entries if icons are available or generated as same-origin assets.
- `public/sw.js`
  - Add versioned same-origin app-shell/runtime cache.
  - Precache root shell, manifest, sample trace, and stable public assets.
  - Runtime-cache same-origin `GET` requests needed for Vite/build chunks.
  - Never send trace/sequence bytes anywhere; do not add analytics or remote endpoints.

### UI/design system

- `src/components/TraceViewer.ts`
  - Add a persistent privacy/offline affordance near the dropzone/app shell, visible in loaded and empty states.
  - Copy should be direct: “Runs entirely in your browser — nothing is uploaded.”
  - Include offline-ready messaging only after it is true or word it conservatively, such as “Offline-ready after first load.”
- `src/style.css`
  - Style the affordance using existing tokens for color, spacing, radius, elevation, focus, and dark-mode parity.
  - Respect `prefers-reduced-motion`.

### Tests

- `tests/e2e/privacy-offline.e2e.test.ts`
  - Add the no-trace-upload E2E flow:
    1. install request listeners/routes before user file load;
    2. load `fixtures/ab1/310.ab1`;
    3. derive representative trace byte windows and parsed sequence windows;
    4. paste a reference sequence and click Align;
    5. export FASTA or variants/download;
    6. assert no request body contains raw trace bytes, full/partial base64 trace bytes, plain sequence, or representative sequence substrings.
  - Add the offline PWA E2E flow:
    1. load app online;
    2. wait for service worker readiness/control;
    3. wait for sample chromatogram render;
    4. switch context offline;
    5. reload;
    6. verify app shell, privacy affordance, status, and non-blank cached sample chromatogram.
- `tests/e2e/helpers/ux-gallery.ts`
  - Extend the `UxState` union if a dedicated screenshot state is added.
- `tests/e2e/ux-gallery.e2e.test.ts`
  - Capture the privacy/offline affordance state in light/dark and all configured viewport projects.
- `tests/e2e/front-door-polish.e2e.test.ts`
  - Add focused assertions for persistent privacy/offline copy and accessible text if not fully covered by the new spec.

### Devlog/build docs

- `blog/2026-07-07-v31-private-offline/index.html`
  - Add a devlog entry describing the privacy proof, offline behavior, screenshot gate, and UX-quality review.
- `blog/index.html`
  - Add the new devlog entry at the top.
- `vite.config.ts`
  - Add the new devlog page to `build.rollupOptions.input` so it is emitted.
- `LEARNINGS.md`
  - Add a durable note if implementation discovers service-worker/base-path behavior future agents must remember.

## Step-by-step implementation

1. **Baseline validation**
   - Run `npm run lint && npm run typecheck && npm run test` before code edits to capture existing status.
   - Run narrower E2E only if needed to verify current behavior before changing PWA/test config.

2. **Add PWA shell**
   - Add `public/manifest.webmanifest`.
   - Add `public/sw.js` with versioned cache, install/activate cleanup, same-origin `GET` handling, and offline fallback for app navigation.
   - Register the worker in `src/main.ts`.
   - Keep GitHub Pages base-path support by deriving cache URLs from service-worker scope rather than hardcoding `/`.

3. **Add privacy/offline affordance**
   - Add a persistent, accessible UI element in `TraceViewer.ts`.
   - Style it in `src/style.css` with existing design tokens and light/dark parity.
   - Ensure it is keyboard/screen-reader legible and does not crowd the narrow-mobile front door.

4. **Add no-upload E2E proof**
   - Build a Playwright request-body inspector that records every request and fails if any body contains user fixture bytes or derived sequence text.
   - Exercise a realistic flow: load fixture, render, align to reference, export.
   - Explicitly allow static same-origin `GET` requests and bundled sample fetches while rejecting any `POST`/request body with trace/sequence content.

5. **Add offline E2E proof**
   - Warm service worker/cache online.
   - Disconnect network with Playwright.
   - Reload and assert app shell + cached sample chromatogram still render.
   - Add a non-blank canvas assertion to avoid vacuous offline success.

6. **Screenshot gate update**
   - Add privacy/offline state to `ux-gallery.e2e.test.ts` and helper type.
   - Run `npm run ux:gallery`.
   - Include the written UX-quality review in the devlog/PR body: what is great, what still needs improvement.

7. **Devlog/build wiring**
   - Add the new devlog page.
   - Update `blog/index.html`.
   - Update `vite.config.ts` Rollup input for the devlog page.

8. **Full validation**
   - Run and paste verbatim output for:
     - `npm run lint`
     - `npm run typecheck`
     - `npm run test`
     - `npm run test:e2e`
     - `npm run ux:gallery`
     - `npm run perf:smoke`
     - `npm run build`
   - If any check fails, fix only issues caused by this PR and document unrelated existing failures.

9. **Security/privacy validation**
   - Run secret scanning on changed files before committing.
   - Run parallel validation before final handoff if production code changed.
   - Re-run validation after any significant fix.

10. **Commit/PR metadata**
   - Use a Conventional Commit message.
   - Include this trailer in the first commit message:
     - `Unit-ID: b568cb5c-bf82-4287-bb27-52612947cabf`
   - Put the marker on its own line in the PR body:
     - `b568cb5c-bf82-4287-bb27-52612947cabf`

## Acceptance criteria verification

1. **COMPETITOR-BENCHMARKED**
   - Verify the implementation cites this research plus existing competitor/design/perf/UX-gallery work.
   - If the implementation PR broadens scope, refresh the competitor-gap assessment in `docs/research/` with SnapGene, Benchling, Chromas, FinchTV, ApE privacy/offline comparison.

2. **FRICTIONLESS FIRST RUN**
   - Verify sample auto-load still renders.
   - Verify empty-state/dropzone, sample button, loading, error, and empty states still pass existing E2E.
   - Verify privacy affordance is visible without configuration.

3. **COHESIVE DESIGN SYSTEM**
   - Verify new styles use existing tokens and work in light/dark.
   - Verify UX gallery captures the state across desktop, tablet, and narrow mobile.

4. **DELIGHT**
   - Keep the affordance tasteful and calm.
   - Verify reduced-motion behavior and avoid gratuitous animation.

5. **ACCESSIBILITY**
   - Verify copy is screen-reader legible, contrast-safe, and present on narrow mobile/touch.
   - Re-run existing a11y/touch/front-door E2E coverage.

6. **PERFORMANCE**
   - Verify service-worker registration does not block app mount.
   - Run `npm run perf:smoke` and existing E2E perf coverage.

7. **POWER PRESERVED**
   - Verify existing editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace tests still pass.
   - The new no-upload proof must include parse → align → export.

8. **Every-PR requirements**
   - CI-equivalent local commands pass with verbatim output.
   - Screenshot gate updated and run.
   - Devlog updated.
   - No AI/tool attribution in code, docs, commits, or PR text.

## Key risks

- Offline behavior can be environment-sensitive under Vite dev; prefer validating against production build/preview if dev-mode service-worker caching is unreliable.
- Service-worker scope and GitHub Pages base path can break if URLs are hardcoded.
- Network no-upload tests can become too loose if they only assert request count; inspect request bodies and compare against known user trace and sequence signatures.
- Over-broad service-worker runtime caching can mask broken deploy assets; keep cache versioned and same-origin.
- UI copy could overpromise if offline cache is not ready yet; use copy that accurately distinguishes “runs in browser” from “offline-ready after first load.”

