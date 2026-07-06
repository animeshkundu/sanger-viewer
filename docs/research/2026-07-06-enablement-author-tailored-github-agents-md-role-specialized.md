# Enablement research — role-specialized GitHub agents for UX-leadership push

Date: 2026-07-06  
Owner: repository automation  
Work unit: author tailored `.github/agents/*.md` custom-agent definitions and domain-tune `AGENTS.md` plus `.github/copilot-instructions.md` for the category-leading Sanger viewer push.

## Context

The mission is to make `animeshkundu/sanger-viewer` the category-leading Sanger trace viewer through many small, CI-green, screenshot-gated, devlog-updated PRs run by parallel GitHub cloud agents. This enablement work is documentation/configuration only: it should improve future agent behavior without changing viewer runtime behavior.

The requested role-specialized custom-agent definitions are:

- `.github/agents/ux-designer.md`
- `.github/agents/accessibility.md`
- `.github/agents/performance.md`
- `.github/agents/test-author.md`
- `.github/agents/code-reviewer.md`
- `.github/agents/devlog-writer.md`

Important sandbox note: this planning pass did not read any existing `.github/agents` files. The repository listing did not show that directory, so the implementation should create it if absent and avoid overwriting existing agent definitions without checking repository state in the implementation environment.

## Repository facts found

### Current guidance files

- `AGENTS.md` is short and currently says to run lint/typecheck/tests after code changes, keep changes surgical and focused on Sanger viewer behavior, and preserve GitHub Pages base path support.
- `.github/copilot-instructions.md` currently emphasizes TypeScript, existing parser/rendering modules, parser fixtures/tests, and `npm run lint && npm run typecheck && npm run test` before finalizing.
- `.github/pull_request_template.md` requires a UX gallery artifact, a written UX assessment, accessibility measurements, no capability regressions, and devlog index / Vite input updates when adding a devlog entry.

### Validation and CI gates

`package.json` exposes these relevant commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run perf:smoke`
- `npm run build`
- `npm run ux:gallery`

`.github/workflows/ci.yml` currently runs the main test job on Ubuntu with lint, typecheck, Vitest, Playwright E2E, perf smoke, and build. It also runs a separate `ux-gallery` job that captures screenshots and uploads `ux-gallery-screenshots/` as an artifact. The work-unit problem statement asks future PRs to be green on the full matrix including Windows; the current inspected CI file does not show a Windows matrix, so the enablement instructions should explicitly tell agents to preserve/expand matrix expectations when CI evolves and to check actual workflow configuration before claiming Windows coverage.

### Existing UX/design/performance evidence to preserve

Relevant devlog and research artifacts already exist and should be cited by future agents:

- `blog/2026-07-04-v17-design-research/index.html`: competitor-grounded design research covering Chromas, FinchTV, SnapGene, UGENE, Geneious, and Benchling. It emphasizes trace-first UX, progressive disclosure, contextual layering, dark/accessibility parity, and not losing power features.
- `blog/2026-07-04-v17-perf-reliability-audit/index.html`: measured performance/reliability audit with explicit budgets, bottlenecks, and cross-feature reliability matrix.
- `blog/2026-07-05-v28-ux-gallery/index.html`: automated UX gallery gate, state/theme/viewport screenshot matrix, written UX assessment expectations, and initial current-state gaps.
- `docs/research/next-killer-features.md`: competitor and user-need research for post-v1 differentiators.
- `docs/specs/*.md`: feature specs for differentiators such as permalinks, batch import, session workspaces, reference context, contig assembly/review, reference alignment, variant review, primer design/Tm, and in-silico PCR.

### Devlog conventions

- Devlog entries live under `blog/YYYY-MM-DD-vNN-slug/index.html`.
- `blog/index.html` manually lists entries.
- `vite.config.ts` only emits devlog HTML pages that are explicitly listed in `build.rollupOptions.input`; new devlog entries must be added there.
- Existing devlog entries are HTML pages using `/src/style.css` and `site-shell` / `blog-entry` classes.

### Durable repo docs

- `docs/research/README.md` and `docs/plans/README.md` require one Markdown file per entry named `YYYY-MM-DD-slug.md`, with date/owner, context, findings or plan, and related links/follow-ups.
- `LEARNINGS.md` exists as a durable learning log and should be updated when future implementation discovers reusable gotchas.
- `CHANGELOG.md` exists with an `[Unreleased]` section and can be updated if enablement changes are considered notable for contributors.

## Domain tuning implications

The implementation should tune repo-wide agent guidance around these durable behaviors:

1. Every UX/UI change must be grounded in competitor research and current-state screenshot evidence, not subjective taste alone.
2. Every feature PR must preserve existing power features: editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace workflows.
3. Every visual/layout PR must reuse the existing design system and tokens rather than introducing one-off styling.
4. Every PR that touches UI must run or rely on the UX gallery gate and include a written screenshot review.
5. Accessibility is a hard gate: keyboard operability, focus visibility, contrast, ARIA, and narrow-mobile/touch behavior must be verified.
6. Performance-sensitive work must respect the perf harness and the v17 audit budgets, especially pan/zoom smoothness and no unnecessary recomputation.
7. Devlog updates are part of shipped work; new entries must be wired into `blog/index.html` and `vite.config.ts`.
8. No model/tool attribution should be added anywhere in commits, PR text, code comments, or docs.

## Role-agent definition strategy

Each custom-agent file should be short, role-specific, and operational. It should include:

- mission and scope
- repository evidence to inspect before acting
- required validation commands or gates
- acceptance checklist
- handoff output format
- explicit anti-patterns / scope boundaries

Recommended role emphasis:

- `ux-designer.md`: competitor-benchmarked UX, first-run friction, cohesive design system, delight, screenshot review, no feature loss.
- `accessibility.md`: WCAG 2.1 AA, keyboard/focus/ARIA/contrast/touch, reduced motion, test evidence.
- `performance.md`: pan/zoom frame budgets, large AB1/SCF behavior, perf harness, no unnecessary DOM/canvas recompute, measurable budgets.
- `test-author.md`: tests that fail without the change, fixture-driven parser/rendering tests, Playwright UX state coverage, no skips/stubs.
- `code-reviewer.md`: high-signal review focused on regressions, security/privacy, feature preservation, CI/UX/devlog completeness, no style noise.
- `devlog-writer.md`: concise HTML devlog entry aligned with existing style, update `blog/index.html` and `vite.config.ts`, document evidence and follow-ups.

## Key risks

- Existing `.github/agents` content may exist in another environment; implementation must not overwrite without reading current state.
- Instructions can become too broad and cause agents to attempt oversized PRs. Keep role definitions focused on small independently shippable slices.
- Custom-agent instructions can fragment from `AGENTS.md` and `.github/copilot-instructions.md`. Keep shared gates centralized and role files additive.
- CI currently inspected as Ubuntu-only; wording must avoid falsely claiming Windows matrix exists while still preserving the mission requirement for full-matrix readiness.
- Devlog requirements can be missed because devlog pages need both `blog/index.html` and `vite.config.ts` updates.

## Related links and follow-ups

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/pull_request_template.md`
- `.github/workflows/ci.yml`
- `blog/2026-07-04-v17-design-research/index.html`
- `blog/2026-07-04-v17-perf-reliability-audit/index.html`
- `blog/2026-07-05-v28-ux-gallery/index.html`
- `docs/research/next-killer-features.md`
- `docs/specs/`
