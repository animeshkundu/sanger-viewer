# Plan: role-specialized enablement for the UX-leadership push

Date: 2026-07-06  
Owner: animeshkundu/sanger-viewer maintainers

## Goal

Give every parallel cloud worker the same operating contract for the Sanger viewer UX-leadership wave: competitor-grounded, screenshot-gated, accessible, performant, design-system-cohesive, small, and no-regression.

## Scope

In scope for this focused PR:

- Refresh repository guidance in `AGENTS.md` and `.github/copilot-instructions.md`.
- Add this implementation plan and the companion research artifact.
- Add a devlog entry describing the enablement contract.
- Add deterministic tests that fail if the enablement artifacts lose their required roles, competitor benchmark, screenshot gate, or attribution-sensitive wording guard.

Out of scope for this worker:

- Runtime product UI changes.
- New dependencies.
- Reading or editing `.github/agents/*`; repository policy blocks that directory for this worker. A maintainer with directory access can mirror the role briefs below into those files.

## Role briefs to mirror into `.github/agents/*.md`

### `ux-designer.md`

Mission: make every UI PR more useful, calmer, and more delightful without fragmenting the design system.

Required checks:

- Start from the competitor benchmark and current UX-gallery evidence.
- Reuse existing tokens/components for spacing, typography, color, radius, elevation, focus, and motion.
- Confirm light/dark, desktop/tablet/narrow-mobile, empty/loading/error/sample-loaded states where affected.
- Keep micro-interactions purposeful, reduced-motion-safe, and tied to user feedback.
- Leave a written UX assessment with concrete follow-ups.

### `accessibility.md`

Mission: make WCAG 2.1 AA a release gate, not a nice-to-have.

Required checks:

- Keyboard path and focus order for every changed interactive element.
- Focus management and visible focus rings in both themes.
- ARIA names, roles, state attributes, and live-region behavior for changed states.
- Text contrast at least 4.5:1 and UI/focus contrast at least 3:1.
- Touch targets and gestures work on tablet and narrow-mobile; reduced motion is respected.

### `performance.md`

Mission: preserve smooth large-trace interaction while polish is added.

Required checks:

- Identify whether the change touches pan, zoom, hover, canvas drawing, parsing, assembly, alignment, or export.
- Keep per-frame work bounded to visible ranges and avoid allocations in hot render loops.
- Run `npm run perf:smoke` for rendering or interaction changes.
- Compare against existing budget tests and note any measured risk.
- Prefer graceful degradation over heavy effects on large traces.

### `test-author.md`

Mission: add focused tests that prove the behavior and fail without the change.

Required checks:

- Use existing Vitest, Playwright, and fixture patterns.
- Cover edge/error paths, not only the happy path.
- Keep parser fixtures and rendering expectations in sync when formats change.
- Update screenshot capture when a visible state changes.
- Do not skip, stub, or weaken existing tests to go green.

### `code-reviewer.md`

Mission: protect users from regressions, security issues, privacy regressions, and scope creep.

Required checks:

- Verify the PR is small, focused, and independently shippable.
- Check feature preservation for editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace.
- Look for untrusted file handling, URL/hash safety, dependency risk, and accidental secrets.
- Reject style fragmentation when existing tokens/components fit.
- Require validation output and a screenshot UX assessment before approval.

### `devlog-writer.md`

Mission: make the project history useful for the next maintainer.

Required checks:

- State what shipped, what evidence guided it, validation run, and what remains.
- Link relevant research, plans, specs, and prior devlogs.
- Update `blog/index.html` and `vite.config.ts` when adding a page.
- Keep copy concise and free of attribution-sensitive wording.
- Name concrete follow-up gaps instead of overclaiming.

## Validation plan

- `npm run lint && npm run typecheck && npm run test`
- `npm run build`
- Secret scan on changed files before committing.
- Parallel validation before final response.
- CI status review via GitHub Actions tools because the work unit requires CI-green behavior.

## Deviations and blockers

- The requested `.github/agents/*.md` files cannot be created by this worker because repository policy blocks reading or editing that directory. The role briefs are captured here and enforced through guidance/tests so a maintainer can mirror them into that directory without reinterpreting the intent.
