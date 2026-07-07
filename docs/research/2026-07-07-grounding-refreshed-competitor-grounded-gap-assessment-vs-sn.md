# Grounding research: refreshed competitor-grounded gap assessment vs SnapGene, Benchling, Chromas, FinchTV, and ApE

Date: 2026-07-07  
Owner: @animeshkundu / cloud-agent work unit  
Status: planning artifact for a docs-only grounding PR  
Controller marker: `cda200be-4d1c-4e30-87e4-fcb80b87ef52`

## Context

This research artifact grounds the next parallel UI/UX/delight build wave for `animeshkundu/sanger-viewer`. It supersedes the stalled empty gap-assessment PR #46 by turning the current repository evidence into a concrete, prioritized, testable backlog.

The scope is documentation-only for this dispatch: no app code changes, no feature implementation, and no pull request opening. The implementation wave should use this report, the plan in `docs/plans/2026-07-07-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`, and the existing devlog/audit trail as its shared source of truth.

## Evidence reviewed

Repository evidence:

- Existing competitor/product research: `docs/research/next-killer-features.md`.
- Design research devlog: `blog/2026-07-04-v17-design-research/index.html`.
- Performance harness devlog: `blog/2026-07-04-v19-perf-harness/index.html`.
- UX-gallery gate and current-state assessment: `blog/2026-07-05-v28-ux-gallery/index.html`.
- Front-door polish follow-up: `blog/2026-07-05-v29-front-door-polish/index.html`.
- Next-improvements research including ApE: `blog/2026-07-05-v30-next-improvements-research/index.html`.
- Current gallery capture spec: `tests/e2e/ux-gallery.e2e.test.ts`.
- Current validation scripts: `package.json`.
- Current design-token surface: `src/style.css`.

External public sources checked for this refresh:

- SnapGene Viewer: https://www.snapgene.com/snapgene-viewer — Viewer mode supports viewing plasmid maps, annotating features, and sharing sequences for free; unrestricted SnapGene is needed for deeper workflows such as cloning/PCR/construct validation/customization.
- Benchling homepage: https://www.benchling.com/ — positions Benchling as an account-backed, cloud-based scientific platform centered on structured data, experiment execution, and collaboration.
- Chromas product page: https://technelysium.com.au/wp/chromas/ — documents AB1/SCF/ZTR opening, print/zoom, low-quality/vector removal, FASTA/FASTQ/etc. export, reverse-complement, search, translations, image copy, batch processing, and Windows compatibility; multi-read assembly is directed to ChromasPro.
- FinchTV distribution page: https://digitalworldbiology.com/finchtv — confirms FinchTV remains a downloadable desktop trace-viewer distribution rather than a browser-native flow.
- ApE site: https://jorgensen.biology.utah.edu/wayned/ape/ — confirms the ApE desktop tool/site is active, with the page last modified June 11, 2026.

## Current-state feature inventory

The repository is no longer a simple trace renderer. It already has most power features expected from a serious Sanger viewer:

- Client-side AB1/SCF parsing and chromatogram rendering.
- Sample auto-load and private in-browser file loading.
- Empty, loading, and error states.
- Reverse-complement/strand view.
- Quality trimming and quality track.
- Search, metadata, base inspector, mixed-base calling, annotations, plasmid/restriction map, reference alignment, variant review, contig/consensus workflows, primer/Tm/in-silico PCR, print/PDF, SVG/PNG/FASTA/FASTQ/export flows, permalinks, multi-trace workspace, clone-screen stacked comparison, keyboard/touch coverage, light/dark tokens, and automated UX-gallery capture.

The gap is therefore not raw capability. The gap is turning that capability into a category-leading experience that feels instantly understandable, cohesive, performant, accessible, and delightful across every state.

## Competitor benchmark

Rating scale: 1 = poor / missing, 3 = adequate, 5 = category-leading for the specific criterion. Scores are relative to the Sanger-trace viewer niche, not broad molecular-biology suites.

| Tool | First-run friction | Trace-reading clarity | Power workflow depth | Cohesive modern UI | Accessibility / mobile | Privacy / local-first | Key lesson for sanger-viewer |
|---|---:|---:|---:|---:|---:|---:|---|
| sanger-viewer current | 4 | 4 | 4 | 3 | 4 | 5 | Strong local-first capability; needs tighter visual cohesion, better screenshot-rated backlog, and repeated small polish PRs. |
| SnapGene Viewer / SnapGene | 3 | 5 | 5 | 5 | 3 | 3 | Excellent contextual layering and polished document model; avoid feature sprawl and install/license friction. |
| Benchling | 2 | 3 | 5 | 5 | 4 | 1 | Strong web collaboration/design language; sanger-viewer can win on zero-account, private, instant local use. |
| Chromas | 3 | 4 | 3 | 2 | 2 | 4 | Fast single-trace utility and batch/export breadth; do not copy dated menu density or Windows-only constraints. |
| FinchTV | 3 | 4 | 2 | 2 | 2 | 4 | Chromatogram-first clarity with little ceremony; browser-native zero-install is the wedge. |
| ApE | 3 | 3 | 4 | 2 | 2 | 4 | Free plasmid/trace adjacency is valuable; sanger-viewer can exceed it with web access, dark mode, tested a11y, and stronger trace UX. |

### SnapGene

SnapGene sets the strongest bar for perceived polish: trace, sequence context, metadata, alignments, and construct context feel like coordinated parts of one document. The current sanger-viewer already has many equivalent primitives, but they are still experienced as panels and feature slices rather than one seamless review story. SnapGene also shows that feature depth must be progressively disclosed; dumping all power in the default view makes a tool feel complicated even when each feature is useful.

Opportunity: win on privacy and access. A browser-loaded, local-only trace reviewer that opens immediately without installation can be more convenient than SnapGene Viewer for quick handoffs, provided the first screen feels as intentional as a desktop suite.

### Benchling

Benchling is strongest where account-backed collaboration, structured records, and polished web UI matter. It is weakest for this niche when a user wants instant local review of a sequencing-service file without account setup or upload. The current app should not try to become Benchling. It should borrow Benchling's cohesive design-system discipline, state clarity, and web-native interactions while keeping the zero-config local-first promise.

Opportunity: make “private in-browser trace review” feel premium rather than utilitarian.

### Chromas

Chromas remains a benchmark for direct utility: open traces, inspect peaks, reverse-complement, search, export, print, copy images, and batch process. Its official page explicitly frames Chromas as free for simple DNA sequencing projects that do not require multi-read assembly. The dated Windows-only surface and command density leave room for a more modern, accessible, cross-platform browser tool.

Opportunity: keep the directness and export breadth, but organize it with progressive disclosure and measurable UI consistency.

### FinchTV

FinchTV’s lesson is restraint: a chromatogram-first reading experience can feel approachable because the user sees the trace immediately and is not forced into a broader project shell. Its limitation is that it remains a desktop download/distribution flow and does not appear to offer a modern web/mobile accessibility contract.

Opportunity: preserve the chromatogram as the hero, then make sample loading, file drop, loading feedback, and zoom/pan feel instant and forgiving.

### ApE

ApE matters because it is free, familiar in academic cloning workflows, and co-locates plasmid/restriction-map thinking with sequence review. It is not primarily a modern web-first trace UX benchmark. The current sanger-viewer already has browser access, dark mode, tested a11y primitives, quality visualization, and plasmid-map direction. The remaining challenge is making those advantages obvious within the first minute.

Opportunity: become the easiest free way to move from “I received an AB1” to “I can verify my construct, explain the result, and share review context.”

## Rated current-state screenshot UX gallery

The current repository already has a screenshot gate via `tests/e2e/ux-gallery.e2e.test.ts`, which captures the following state × theme × viewport matrix: hero-on-load, sidebar-expanded, sidebar-collapsed, inspect-panel, map-panel, analyze-panel, share-panel, empty-state, loading-state, toolbar-export-menu, keyboard-focus, and hover-tooltip in light/dark and desktop/tablet/narrow-mobile where applicable.

The ratings below are grounded in the v28 UX-gallery assessment and the v29 front-door polish follow-up. They should be refreshed with actual screenshots during the implementation PR by running `npm run ux:gallery` and attaching the generated `ux-gallery-screenshots/index.html` artifact.

| Gallery state | Current UX rating | What is working | Gap to category-leading UX | Testable follow-up |
|---|---:|---|---|---|
| hero-on-load | 4/5 | Chromatogram appears above the fold; sample renders without setup. | Needs clearer “what can I do next?” guidance without cluttering the hero. | Screenshot review should confirm trace is primary, next actions visible, no visual crowding in both themes. |
| sidebar-expanded | 3/5 | Tools are grouped into tabs and no longer form one long vertical wall. | Some panels still feel like feature-specific islands rather than one design system. | Token audit across all panel cards, labels, borders, spacing, focus states. |
| sidebar-collapsed | 4/5 | Reclaims trace width and supports focused reading. | Collapse/expand transition should feel responsive but respect reduced motion. | Reduced-motion and visual regression checks for shell transition. |
| inspect-panel | 3/5 | Search and inspection tools are discoverable. | Dense expert controls need stronger hierarchy and clearer empty/no-selection states. | E2E + screenshot state for no-selection, selected base, search no-results. |
| map-panel | 3/5 | Plasmid/restriction map exists and is trace-linked. | Needs stronger visual integration with trace viewport and better narrow-mobile affordance. | Screenshot gate for map active, selected range, dark mode, mobile. |
| analyze-panel | 3/5 | Contig/reference/variant/primer power is present. | Highest risk of “broken/complicated” feel due to many advanced workflows sharing space. | Panel inventory test: every advanced panel has consistent heading/help/error/empty patterns. |
| share-panel | 3/5 | Permalink primitive exists and preserves local-file privacy. | Sharing needs clearer copy around what is and is not embedded. | E2E should assert privacy copy and reattach flow; screenshot review should rate clarity. |
| empty-state | 4/5 | v29 added dashed dropzone, privacy wedge, and friendly sample CTA. | Emoji illustration is platform-variable; choose-file affordance may still look link-like. | Replace with tokenized illustration/button treatment; screenshot rating must improve to 5/5. |
| loading-state | 4/5 | Names the file and clearly says the trace is loading. | No progress estimate or resilient long-file guidance. | Routed-delay E2E should verify file name, visible status, and graceful completion/failure. |
| toolbar-export-menu | 3/5 | Many exports are available behind one menu. | Common export action may be under-emphasized; mobile clipping risk. | Screenshot + E2E for desktop/tablet/mobile menu positioning and keyboard Escape/click-outside. |
| keyboard-focus | 4/5 | Focus rings are visible and contrast-tested. | Need full-route keyboard acceptance for every primary workflow, not just selected controls. | Add keyboard-only journey tests per build-wave PR. |
| hover-tooltip | 3/5 | Tooltip exposes per-base details. | Hit target can feel fussy on dense/large traces; touch equivalent needs parity. | Widen hit region with perf budget; add pointer/touch tests and screenshot state. |

Current aggregate rating: **3.5/5**. The app is already unusually capable and privacy-friendly, but it is not yet category-leading on perceived coherence and delight. The highest-return wave is therefore not “add one more feature”; it is a sequence of small PRs that make existing power feel effortless and unified.

## Prioritized, testable UX/UI/delight improvement backlog

Priority rubric: P0 = blocks credible category-leading claim; P1 = high-impact first-wave improvement; P2 = important polish or power-preservation support; P3 = later refinement.

| Priority | Backlog item | Acceptance test / evidence | Primary acceptance criteria grounded |
|---|---|---|---|
| P0 | Publish this refreshed competitor-gap research and plan, superseding empty PR #46. | `docs/research/...` and `docs/plans/...` exist, cite current competitor/app evidence, and are committed with unit marker. | Competitor-benchmarked, every-PR process. |
| P1 | Create a devlog entry for the grounding PR and link it from `blog/index.html`. | Build includes the new page; devlog states benchmark findings, screenshot-rating summary, and next backlog. | Every PR devlog updated; competitor-benchmarked. |
| P1 | Turn the UX-gallery into a rated PR artifact, not only screenshots. | `npm run ux:gallery` produces screenshots plus written “is this great UX / what to improve” review in PR body or artifact. | Screenshot-gated, delight, design system. |
| P1 | Design-system cohesion audit across all sidebar panels and transient states. | Inventory all panel/card/error/empty/loading/export/focus styles; tests or screenshots show light/dark parity and token reuse. | Cohesive design system, accessibility. |
| P1 | Empty-state illustration and CTA affordance polish. | Screenshot rating for empty-state reaches 5/5; CTAs remain native controls and ≥44 px; no emoji-only meaning. | Frictionless first run, delight, accessibility. |
| P1 | Mobile/narrow-panel navigation refinement. | 360×640 screenshots show no clipped core controls; E2E covers touch and keyboard-reachable alternatives. | Accessibility, cohesive design, frictionless first run. |
| P1 | “What next?” hero guidance that does not reduce trace prominence. | Hero-on-load screenshot confirms trace remains primary and top next actions are obvious. | Frictionless first run, delight, power preserved. |
| P2 | Loading/error/empty state taxonomy and copy audit. | Every parse/load/sample/user-file error path has consistent title, explanation, retry/recover action, and privacy-safe copy. | Frictionless first run, accessibility. |
| P2 | Tooltip/pointer forgiveness and touch parity. | Hover/tap base detail works with wider target; perf tests show no pan/zoom regression. | Delight, performance, accessibility. |
| P2 | Export/share clarity pass. | Export menu remains keyboard accessible; share panel explains local-file reattach; common export is easy to discover. | Power preserved, frictionless, accessibility. |
| P2 | Advanced workflow panel hierarchy pass. | Analyze/map/inspect/share panels use shared headings, helper text, empty states, and progressive disclosure. | Cohesive design system, power preserved. |
| P2 | Performance budget guard for every interaction PR. | `npm run perf:smoke` and relevant Playwright perf checks remain green; screenshot interactions do not add animation jank. | Performance, delight. |
| P3 | Cross-platform non-emoji illustration set and motion tokens. | Reduced-motion respected; icons render consistently on Windows/macOS/Linux/mobile screenshots. | Delight, accessibility. |

## Recommended small PR sequence

1. **Grounding docs/devlog PR**: commit this research, the plan, and a devlog entry. No app code.
2. **Rated UX-gallery PR**: extend screenshot artifact/review workflow so every visual PR includes ratings and explicit “what to improve next.”
3. **Design-token cohesion PR**: audit and normalize panel/card/state token use without changing workflows.
4. **Empty-state / first-run delight PR**: replace emoji variance, strengthen CTAs, keep privacy and sample-data flow tested.
5. **Narrow-mobile navigation PR**: make panel access feel intentional on 360×640 and touch, without breaking desktop.
6. **Loading/error taxonomy PR**: unify status states and recovery paths for sample, user files, parser failures, unsupported formats, and empty workspaces.
7. **Tooltip/touch forgiveness PR**: improve base-detail discoverability while preserving 60fps pan/zoom budgets.
8. **Advanced-panel hierarchy PR**: make Analyze/Map/Inspect/Share feel like one product surface.

## Acceptance-criteria mapping for the build wave

1. **Competitor-benchmarked**: this document provides the competitor matrix, current-state ratings, and prioritized backlog; implementation should add the devlog entry and PR-body marker.
2. **Frictionless first run**: current baseline is strong; next PRs should raise empty/loading/sample guidance from 4/5 to 5/5 and verify with screenshots and E2E.
3. **Cohesive design system**: current tokens exist in `src/style.css`; next PRs must audit application across all panel states, not create fragmented styles.
4. **Delight**: focus on purposeful micro-interactions, CTA affordance, forgiving pointer/touch behavior, and reduced-motion compliance.
5. **Accessibility**: every UI PR must include keyboard/touch/contrast evidence and retain WCAG 2.1 AA; current tests already cover important primitives.
6. **Performance**: run `npm run perf:smoke`, protect pan/zoom/hover hot paths, and avoid animation/layout work in render loops.
7. **Power preserved**: every PR should explicitly regression-test or smoke-test editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace if touching shared UI surfaces.

## Key risks

- **Research without screenshots**: this dispatch can rate current UX only from existing gallery/devlog evidence. The implementation PR must regenerate and attach actual current screenshots.
- **Scope creep**: competitor benchmarking can tempt broad redesign. The wave must stay in small independently shippable PRs.
- **Fragmented styling**: adding local polish per panel can worsen cohesion. Work must reuse `src/style.css` tokens and shared components/patterns.
- **Power regression**: moving controls or changing panel hierarchy can break advanced workflows that are already implemented. Power-preservation checks must be explicit.
- **Mobile/accessibility gaps**: narrow-mobile/touch can regress while desktop screenshots look good. Keep mobile screenshots and touch tests mandatory.
- **Performance regressions from delight**: micro-interactions should not touch hot rendering loops or add layout thrash during pan/zoom.

## Links and follow-ups

- Plan artifact: `docs/plans/2026-07-07-grounding-refreshed-competitor-grounded-gap-assessment-vs-sn.md`.
- Follow-up devlog page should use a short dated slug, for example `blog/2026-07-07-grounding-gap-assessment/index.html`, and be linked from `blog/index.html`.
- Related existing artifacts: PR #19 design research, PR #20 perf audit, v28 UX-gallery gate, v29 front-door polish, v30 next-improvements research.
