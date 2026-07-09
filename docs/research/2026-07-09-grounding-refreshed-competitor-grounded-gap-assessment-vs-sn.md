# Refreshed competitor-grounded gap assessment vs SnapGene, Benchling, Chromas, FinchTV, and ApE

Date: 2026-07-09
Owner: GitHub cloud agent
Controller correlation marker:
unit-id: d21332c9-48df-4f4c-be3f-eaad2147eeff

## Context

This docs-only research artifact supersedes the stalled empty competitor-gap PR #46 and grounds the next UI/UX/delight build wave. It refreshes the earlier merged design research (#19), performance/reliability audit (#20), UX-gallery gate, and v30 next-improvements research with a tighter benchmark focused on:

- SnapGene
- Benchling
- Chromas
- FinchTV
- ApE

The mission standard is not merely feature parity. The target is a private, browser-native Sanger-trace viewer that feels easier, more cohesive, more accessible, and more delightful than the incumbent tools while preserving every existing power feature.

## Evidence base

Repository evidence reviewed:

- `blog/2026-07-04-v17-design-research/index.html` — prior competitor UX study and IA proposal.
- `blog/2026-07-04-v17-perf-reliability-audit/index.html` — measured load, render, interaction, and reliability findings.
- `blog/2026-07-05-v28-ux-gallery/index.html` — automated screenshot gate and initial current-state UX assessment.
- `blog/2026-07-05-v29-front-door-polish/index.html` — follow-up polish for dropzone/loading/mobile touch gaps.
- `blog/2026-07-05-v30-next-improvements-research/index.html` — evidence-grounded post-workspace-shell backlog.
- `tests/e2e/ux-gallery.e2e.test.ts` — current screenshot-state matrix and genuineness checks.
- `.github/pull_request_template.md` — mandatory UX-gallery and written UX-assessment gate.
- PR #46 — closed stalled draft with no completed research artifact.

Competitor source trail reviewed or cited from prior repository research:

- SnapGene product, viewer, and Sanger trace documentation: trace viewing, editing, alignment, document context, and color-vision support signals.
- Benchling DNA/RNA sequence documentation and product positioning: cloud/account-backed sequence record workflows.
- Technelysium Chromas pages: lightweight Windows desktop trace viewing/editing/export and ChromasPro split for assembly.
- Digital World Biology FinchTV page and training references: classic chromatogram-first desktop viewing with sparse modern UX/a11y story.
- ApE official site/manual surface: free desktop plasmid editor with sequence editing, restriction maps, and trace-adjacent cloning workflows.

## Current-state screenshot UX gallery rating

The current UX-gallery gate captures the full state × theme × viewport matrix: `hero-on-load`, `sidebar-expanded`, `sidebar-collapsed`, `inspect-panel`, `map-panel`, `analyze-panel`, `share-panel`, `empty-state`, `loading-state`, `toolbar-export-menu`, `keyboard-focus`, and `hover-tooltip`; in light and dark; across desktop, tablet, and narrow-mobile. The capture is deterministic, validates non-blank chromatogram canvases, and bundles screenshots into the `ux-gallery` CI artifact.

Ratings below use a 1–5 scale where 5 means category-leading for a first-time bench scientist and 3 means usable but not yet delightful.

| Gallery state | Current rating | What is strong | Main gap to close |
|---|---:|---|---|
| Hero on load | 4 | Chromatogram appears immediately from bundled sample data; strong first-run proof that the app works. | Needs a stronger “private, local, no upload” trust cue near the trace and clearer next action for real-file upload. |
| Sidebar expanded | 4 | Power is organized into Inspect/Map/Analyze/Share rather than a vertical command wall. | Some panels still feel independently assembled; token consistency and empty/waiting panel states need stricter review. |
| Sidebar collapsed | 4 | Collapsing returns focus to the trace and improves expert scanning. | Needs persistent orientation affordances so novice users know tools still exist. |
| Inspect panel | 3 | Search, metadata, peaks, and base inspection are discoverable in one area. | Dense scientific metadata can overwhelm first-time users; needs progressive disclosure and clearer “what should I check?” copy. |
| Map panel | 3 | Plasmid/linear map and trace-linked navigation preserve power. | Needs better first-run explanation and empty/reference-missing state language. |
| Analyze panel | 3 | Alignment, assembly, primer/Tm, and clone-screen workflows are preserved. | High capability density risks feeling complicated; needs grouped cards, calmer hierarchy, and task-first copy. |
| Share panel | 3 | Permalink mechanism preserves privacy by encoding viewer state, not file data. | Needs more user-facing explanation of what is and is not shared, plus region-specific sharing in a later PR. |
| Empty state | 4 | v29 improved dropzone spatial cue, privacy copy, and touch target size. | Still needs screenshot-rated delight polish: compact sample CTA, drag-over feedback, and richer error recovery. |
| Loading state | 4 | Loading feedback names the file and avoids silent waits. | No progress/budget language yet; large-file loading should stay reassuring without fake progress. |
| Toolbar export menu | 3 | Export options are grouped and no longer sprawl across the toolbar. | Most common exports need stronger prioritization and keyboard/menu state polish. |
| Keyboard focus | 4 | PR gate requires focus-ring screenshots and a11y checks. | Needs one-by-one WCAG AA keyboard audit across every panel/action, including narrow-mobile/touch alternatives. |
| Hover tooltip | 3 | Peak-level metadata is available in context. | Hit target can feel fussy; tooltip needs touch-friendly equivalent and motion timing review. |

Overall current-state score: **3.6 / 5**. The app is already strong for browser-native privacy, feature breadth, and current CI screenshot discipline. It is not yet category-leading in perceived simplicity, cross-panel cohesion, or guided novice confidence.

## Competitor gap assessment

| Tool | What the competitor teaches | Where sanger-viewer can lead | Verification target |
|---|---|---|---|
| SnapGene | Contextual layering around traces, reference alignment, editing, and construct/document views makes power feel related. | Match the sense of coherent context without desktop install, license friction, or suite sprawl; emphasize instant private trace review and clear tool grouping. | UX gallery shows trace-first load plus cohesive Inspect/Map/Analyze/Share panels in both themes; no feature loss in edit/export/alignment/assembly/permalink workflows. |
| Benchling | Browser-native workflows and sequence records are polished, but cloud/account context is central. | Lead on private, zero-account, local-file trace review that works from a static page and does not upload sequencing files. | First-run copy, share-panel copy, and error/loading states explicitly communicate local-only processing; tests preserve client-side-only behavior. |
| Chromas | Fast, direct single-trace utility remains compelling for routine work. | Keep the “open file → inspect peaks → export” path faster and calmer while adding modern a11y, dark mode, responsive layout, and richer power features. | Screenshot gate verifies first-run, dropzone, export menu, keyboard focus, and narrow-mobile states; E2E verifies core open/render/export path. |
| FinchTV | Chromatogram readability and visible quality context are its lasting strengths. | Make quality confidence visible in the main reading flow while adding modern touch, keyboard, dark-mode, and no-install access. | Gallery and tests cover quality/trace surfaces, hover/touch readout, and narrow-mobile operation. |
| ApE | Free academic cloning workflows benefit from plasmid-map context and lightweight local use. | Combine ApE-like lightweight utility with browser access, dark mode, a trace-native design system, and Sanger-specific UX guidance. | Map panel, annotation/primer/Tm, and trace-linked navigation remain functional while UI tokens stay cohesive across panels. |

## Prioritized, testable improvement backlog

### P0 — Ship the grounding artifact and devlog link

Goal: replace PR #46’s empty/stalled state with a complete benchmark, rated gallery, and implementation plan.

Acceptance:

- Research artifact exists under `docs/research/`.
- Implementation plan exists under `docs/plans/`.
- Follow-up implementation PR updates the devlog and `vite.config.ts` if it publishes a new HTML entry.
- PR body includes the controller marker on its own line.

### P1 — Frictionless first run and trust polish

Goal: make the first 30 seconds unmistakably easy, private, and successful.

Testable outcomes:

- App opens to a rendered chromatogram with bundled sample data without configuration.
- Empty state has clear dropzone, one-click sample data, drag-over feedback, and local-only privacy copy.
- Loading, empty, and parser-error states are screenshot-captured in light/dark and desktop/tablet/narrow-mobile.
- Error paths offer retry/recover actions without losing existing workspace power.

Suggested verification:

- Extend/keep Playwright coverage for sample auto-load, file drop, delayed loading, parser failure, and empty workspace recovery.
- Run `npm run ux:gallery` and complete the written UX assessment.

### P1 — Cohesive design-system consolidation

Goal: all panels look and behave like one product rather than adjacent feature slices.

Testable outcomes:

- Shared tokens cover spacing, typography, colors, radius, elevation, focus, and motion.
- Inspect/Map/Analyze/Share cards share component structure for headings, help text, empty states, buttons, badges, and warnings.
- Light/dark parity is verified for every gallery state.

Suggested verification:

- Screenshot review rates every panel state at 4/5 or higher for cohesion.
- Existing a11y contrast tests continue to pass.
- No new ad hoc colors/radii/elevation values outside the token layer unless explicitly justified.

### P1 — Accessibility hardening to WCAG 2.1 AA

Goal: make keyboard, focus, contrast, ARIA, touch, and narrow-mobile behavior non-negotiable.

Testable outcomes:

- Every interactive control is reachable and operable by keyboard or touch equivalent.
- Focus order follows visual/task order.
- Panel state changes expose accessible names/status where useful.
- Text contrast is at least 4.5:1 and UI/focus contrast at least 3:1.

Suggested verification:

- Add or extend Playwright keyboard/touch tests for all panels and first-run states.
- Preserve current measured contrast assertions.
- Include keyboard-focus screenshots in the UX gallery assessment.

### P2 — Delightful, purposeful micro-interactions

Goal: make feedback feel responsive without visual noise.

Testable outcomes:

- Dropzone, sidebar transitions, hover/touch readouts, export menu, and loading feedback have reduced-motion-safe transitions.
- Interactions never block the trace-render path or violate the performance budget.
- Motion supports state comprehension rather than decoration.

Suggested verification:

- Test `prefers-reduced-motion` behavior.
- Run perf smoke after interaction changes.
- Screenshot review notes whether the motion improves clarity.

### P2 — Performance guardrails for large real traces

Goal: keep pan/zoom near 60fps and prevent UI polish from regressing large-file interaction.

Testable outcomes:

- Pan/wheel/button zoom stay within the existing performance budgets from the v17/v19/v20 audit trail.
- First non-blank render remains under the documented budget on the large fixture.
- New overlays or transitions do not force full trace/sequence rebuilds on pan and wheel.

Suggested verification:

- Run `npm run perf:smoke`.
- Keep changes client-side and avoid new dependencies unless justified.

### P2 — Power preserved while simplifying

Goal: improve approachability without removing expert workflows.

Feature-preservation checklist:

- Editing and undo/redo
- FASTA/FASTQ/QUAL/SVG/print export
- Reference alignment and variant/SNP review
- Paired-read assembly and clone-screen comparison
- Primer design/Tm and in-silico PCR
- Shareable permalinks
- Multi-trace workspace
- Quality trimming, mixed-base calls, annotations, map panel, and metadata/peak inspection

Suggested verification:

- Run unit tests, E2E tests, perf smoke, build, and UX gallery after any implementation PR.
- Add regression tests for whichever preserved feature is touched.

## Risks and mitigations

- **Risk: docs drift from actual UI.** Mitigation: every future implementation PR must update the written UX assessment using the generated gallery, not the aspirational plan.
- **Risk: design-system “cleanup” breaks power workflows.** Mitigation: preserve the feature checklist above and require E2E or unit coverage for touched workflows.
- **Risk: delight becomes animation for its own sake.** Mitigation: require reduced-motion coverage and tie each transition to user feedback.
- **Risk: accessibility is treated as late polish.** Mitigation: keep WCAG AA checks in CI and add tests before visual changes where possible.
- **Risk: performance regresses through overlays.** Mitigation: prefer CSS/DOM overlays that do not trigger chromatogram redraws; verify with perf smoke.

## Decision

The next build wave should treat this repository as already feature-rich but not yet uniformly delightful. The highest-leverage path is a sequence of small, screenshot-gated PRs that tighten first-run confidence, cross-panel cohesion, WCAG AA behavior, and purposeful feedback while preserving the existing expert feature set.

