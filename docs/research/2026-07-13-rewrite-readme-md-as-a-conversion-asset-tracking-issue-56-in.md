# README conversion asset research

- **Date:** 2026-07-13
- **Owner:** animeshkundu/sanger-viewer contributors
- **Tracking issue:** [#56](https://github.com/animeshkundu/sanger-viewer/issues/56)
- **Unit:** `unit-id: b7554ea5-5d19-4fc7-bd01-db91c87a7bbc`

## Context

Issue #56 asks for a repository-front-page README that quickly explains the product, proves the viewer is real, sends scientists to the deployed application, and gives prospective contributors an accurate overview. The implementation unit is restricted to `README.md` and new assets under `docs/media/`; these research and plan documents are the explicitly requested pre-implementation artifacts and are not part of that implementation scope.

## Repository findings

1. The current README already leads with browser-native/private positioning, but links to the GitHub Pages URL rather than the required canonical live URL, uses an existing GIF outside `docs/media/`, has no comparison table, no timed quickstart, and no citation guidance (`README.md`).
2. The application automatically loads `sample.ab1`, so the quickstart can truthfully promise a ready-to-inspect trace. Existing E2E coverage waits for `Loaded sample.ab1` and validates a painted chromatogram (`tests/e2e/workspace-shell.e2e.test.ts`; `tests/e2e/ux-gallery.e2e.test.ts`).
3. The existing Playwright UX-gallery harness is suitable for producing a genuine hero: it waits for deterministic sample loading, rejects a blank chromatogram by measuring canvas luminance variance, disables animations, and captures a full-page PNG (`tests/e2e/ux-gallery.e2e.test.ts:93-104`; `tests/e2e/helpers/ux-gallery.ts:90-154`).
4. Playwright normally starts Vite development mode on port 4173 (`playwright.config.ts:3-13`). To meet the stricter “against the built app” requirement without editing test configuration, build first, run `npm run preview` on port 4173, and invoke the existing desktop hero capture while Playwright reuses that server.
5. The shipped source contains dedicated modules for mixed-base calling, base edits, annotations, consensus/contigs, reference alignment, variant review, primer analysis, in-silico PCR, plasmid maps, permalinks, and multiple exports. README feature claims should stay compact and limited to capabilities visible in these modules (`src/calling/`, `src/editing/`, `src/components/`, `src/alignment/`, `src/variants/`, `src/primers/`, `src/plasmidMap/`, `src/workspace/`, and `src/export/`).
6. CI’s `test` job runs install, lint, typecheck, Vitest, Chromium Playwright E2E, the performance smoke test, and build on Ubuntu with Node 22 (`.github/workflows/ci.yml:13-32`).
7. The package currently reports version `0.1.0`, and no `CITATION.cff` exists (`package.json:2-5`). Citation guidance must not invent a DOI or assert a release tag that this scoped unit cannot establish. The MIT license identifies the copyright holder as “Animesh” (`LICENSE:1-4`).

## Comparison evidence and framing

The comparison should be factual rather than implying that desktop viewers upload trace data. The real browser-native advantage is local processing with no installation: all four products can keep trace work local, while only sanger-viewer opens directly in a modern browser. Product capabilities and licensing should be checked immediately before writing against:

- [SnapGene features](https://www.snapgene.com/features)
- [SnapGene pricing and Viewer mode](https://www.snapgene.com/pricing)
- [FinchTV product page](https://digitalworldbiology.com/finchtv)
- [Chromas product page](https://technelysium.com.au/wp/chromas/)
- Existing repository competitor-source inventory (`docs/research/next-killer-features.md:176-185`)

Use concise text, not ambiguous checkmarks, for the requested dimensions: free availability, private/local handling, zero-install use, and analysis depth. Qualify editions and platform constraints where the official source requires it.

## Screenshot approach

1. Build the production application with its `/sanger-viewer/` base-path behavior.
2. Serve `dist/` through Vite preview on the Playwright port.
3. Run the existing desktop, light-theme “hero on load” capture only.
4. Rely on the harness’s sample-loaded and nonblank-canvas assertions.
5. Copy the deterministic PNG to `docs/media/sanger-viewer-hero.png` and remove the temporary gallery output.
6. Inspect the final image for a loaded chromatogram, legible controls, and absence of transient or private content before linking it with repository-relative Markdown.

## Assumptions and scope decisions

- The required canonical deployment is `https://animesh.kundus.in/sanger-viewer/`; it replaces the current prominent demo link.
- “How to cite” means a copyable software citation using the project name, repository URL, release/version when known, and access date. No DOI will be claimed unless one exists at implementation time.
- The comparison will distinguish local privacy from browser delivery; desktop competitors will not be labeled as uploading data without evidence.
- The strict implementation scope forbids adding a README-specific automated test. Existing screenshot assertions plus reproducible HTTP/render checks are the direct documentation checks; the unchanged full CI suite remains the regression gate.
- CHANGELOG, LEARNINGS, and community-health acceptance criteria belong to other parallel work units and are explicitly excluded from issue #56’s file scope. This unit will report them as out of scope rather than claim to have verified or delivered them.

## Risks

- **Canonical-site availability:** DNS, TLS, or deployment state can make the required URL fail independently of this branch. Record the exact HTTP result and block completion if it is not 200.
- **Comparison drift:** competitor price/features can change. Recheck official pages and use qualified wording.
- **Misleading privacy claim:** “nothing uploaded” is valid for sanger-viewer only if repository/network inspection and browser behavior remain client-side. Phrase the table precisely.
- **Screenshot authenticity or readability:** a blank, loading, clipped, or overly dense capture would undermine trust. Keep the harness assertions and manually inspect the committed image.
- **GitHub rendering lag:** raw image availability and README rendering cannot be proven on `main` until merge. Verify the branch/PR rendering first, then document the post-merge raw URL checkpoint.
- **Conflicting global requirements:** adding tests or updating CHANGELOG/LEARNINGS would violate this unit’s strict file scope. Do not cross that boundary.

## Follow-up

Implement only after this plan is approved. The implementation PR should retain the unit marker on its own line and link issue #56.
