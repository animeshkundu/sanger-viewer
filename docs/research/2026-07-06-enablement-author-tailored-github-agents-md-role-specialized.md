# Enablement research: role-specialized delivery system for the UX-leadership push

Date: 2026-07-06  
Owner: animeshkundu/sanger-viewer maintainers

## Context

This repository is already strong for a browser-first Sanger viewer: local-private rendering, multi-trace workspace, alignment, assembly, primer/Tm, export, permalinks, a performance harness, a measured accessibility suite, and automated UX-gallery screenshots. The next wave needs many small, independently shippable PRs that preserve that power while improving first-run delight, design-system cohesion, accessibility, and smooth interaction.

The enablement gap is coordination. Parallel cloud workers need shared role briefs that point at the same evidence, validation gates, and no-regression promises. This research artifact grounds those briefs in the competitor benchmark, current screenshot UX gallery, and testable backlog.

## Competitor-gap assessment

| Competitor | Current strength to respect | Gap sanger-viewer can exploit | Enablement implication |
|---|---|---|---|
| SnapGene | Polished context, annotation-aware workflows, strong sharing expectations. | Installed/paid editing and alignment workflows are heavier than a private browser-first review loop. | Keep every UX improvement grounded in fast open-to-insight and local-private handoff. |
| Benchling | Browser-native collaboration and cohesive product surfaces. | Cloud-platform account context can be too heavy for one-off sequencing-service files. | Preserve zero-config, no-account first run and avoid turning the viewer into a workspace suite. |
| Chromas | Simple trace-first desktop inspection with obvious edit/export verbs. | Windows desktop install and limited modern web/mobile affordances. | Keep primary actions obvious while raising visual polish, responsive behavior, and dark-mode parity. |
| FinchTV | Low-ceremony trace readability and familiar called-sequence-over-trace layout. | Legacy desktop distribution and limited modern accessibility expectations. | Prioritize readable chromatograms, keyboard/touch paths, and clear state feedback over novelty. |
| ApE | Free plasmid editing mindset and practical cloning context. | Not purpose-built for delightful trace review, screenshot-gated UX, or browser-local sharing. | Connect trace evidence to cloning context without fragmenting the Sanger viewer focus. |

## Rated current-state screenshot UX gallery

Evidence baseline: the merged v28 UX-gallery gate captures key states across light/dark themes and desktop, tablet, and narrow-mobile viewports; v29 front-door polish addressed the most visible empty/loading gaps. The ratings below are a current-state guide for follow-up PRs rather than a claim that this enablement PR changes runtime UI.

| Gallery area | Current rating | Evidence from existing gallery/devlog | Next testable improvement |
|---|---:|---|---|
| First-run empty/dropzone | 4 / 5 | v29 added a dashed dropzone, privacy message, one-click sample path, and 44 px touch targets. | Keep screenshots for empty, drag-over, loading, error, and sample-loaded states in every visual PR. |
| Chromatogram-first hierarchy | 4 / 5 | v27/v28 show the hero chromatogram above the fold with sidebar tools progressively disclosed. | Protect the hero-first layout during panel and toolbar changes with screenshot review. |
| Design-system cohesion | 3 / 5 | v24 tokens exist and v28 gallery shows light/dark parity, but new panels can still drift. | Require token reuse for spacing, typography, color, radius, elevation, motion, and focus states. |
| Accessibility confidence | 4 / 5 | Existing tests measure contrast and focus; touch E2E covers tablet gestures. | Require WCAG 2.1 AA notes and keyboard/touch verification in role briefs and PR descriptions. |
| Performance confidence | 4 / 5 | Perf harness and smoke budget tests exist for large/representative traces. | Performance role must run `npm run perf:smoke` when interaction or rendering paths change. |
| Power preservation | 4 / 5 | Editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace are covered by unit and E2E suites. | Test-author and reviewer roles must map every UI change to affected existing feature paths. |

## Prioritized, testable improvement backlog for the wave

1. **Frictionless first run proof** — capture empty, drag-over, loading, error, sample data, and loaded trace states in both themes and narrow-mobile; acceptance: UX gallery artifact plus written state-by-state assessment.
2. **Design-token convergence** — audit every visible panel against shared spacing, type, color, radius, elevation, and motion tokens; acceptance: no component-local style forks without a documented reason.
3. **Accessible interaction polish** — verify keyboard order, focus return, ARIA names, touch target size, reduced motion, and contrast for every new or changed state; acceptance: WCAG 2.1 AA checklist and passing a11y/E2E coverage.
4. **Performance-safe delight** — add purposeful transitions only when they respect reduced motion and avoid pan/zoom work; acceptance: smooth interaction preserved by the perf harness and UX gallery review.
5. **Power-preserving panel work** — every shell/sidebar/toolbar refinement must explicitly exercise editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace paths that might be affected; acceptance: tests fail if an existing capability disappears.
6. **Devlog and screenshot discipline** — every focused PR updates the devlog, Vite inputs when needed, and the PR written UX review; acceptance: build includes the new page and the PR links the UX-gallery artifact.

## Role-specialized brief requirements

The requested role files should be concise, reusable, and grounded in the same gates:

- `ux-designer`: competitor-benchmarked UX intent, design-token reuse, current-gallery review, delightful but restrained micro-interactions.
- `accessibility`: WCAG 2.1 AA, keyboard/focus/ARIA/touch/reduced-motion verification, contrast evidence, no optional a11y.
- `performance`: 60fps-feeling pan/zoom, perf budget protection, large/real trace awareness, reduced work in render loops.
- `test-author`: tests that fail without the change, fixture-driven parser/rendering coverage, E2E and screenshot gate updates.
- `code-reviewer`: high-signal review for regressions, feature preservation, security, privacy, and scope creep.
- `devlog-writer`: concise devlog entries tied to evidence, screenshots, validation output, and follow-up gaps.

Repository policy currently prevents this worker from reading or editing files under `.github/agents/`. The implementation plan therefore keeps the exact role content centralized and test-covered in repository guidance files that are safe to maintain here, while noting that a maintainer with access to that directory can mirror the briefs into `.github/agents/*.md` without changing the role intent.

## Links

- Design research baseline: `blog/2026-07-04-v17-design-research/index.html`
- Performance audit baseline: `blog/2026-07-04-v17-perf-reliability-audit/index.html`
- UX-gallery gate: `blog/2026-07-05-v28-ux-gallery/index.html`
- Front-door polish: `blog/2026-07-05-v29-front-door-polish/index.html`
