# Research: role-specialized GitHub agent definitions for sanger-viewer

Date: 2026-07-05

## Task classification

This work unit is a documentation/configuration change, not application runtime code. It asks for durable planning artifacts now, then a later implementation that authors role-specialized `.github/agents/*.md` definitions and an ADR capturing the agentic-development setup decision. The implementation should remain small, preserve existing scaffold content from PR #43, and avoid changing viewer behavior.

## Repository facts observed

- `sanger-viewer` is a browser-native, private-by-default Sanger trace workbench for `.ab1` and `.scf` files. README states parsing, rendering, exports, and analysis stay client-side, with a GitHub Pages live demo at `https://animeshkundu.github.io/sanger-viewer/`.
- The target workflow is practical Sanger review: open traces, inspect chromatograms with quality shading and base labels, edit calls, share exact client-side state, align to references, review variants, assemble contigs, and run primer/in-silico PCR analysis.
- Existing guidance files are intentionally short:
  - `AGENTS.md` currently says to run lint/typecheck/tests after code changes, keep changes surgical and Sanger-focused, and preserve GitHub Pages base path support.
  - `.github/copilot-instructions.md` currently says to use TypeScript/existing modules, keep parser fixtures/tests in sync, and run `npm run lint && npm run typecheck && npm run test` before finalizing.
- `package.json` scripts available for implementation verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`
  - `npm run perf:smoke`
  - `npm run build`
  - `npm run ux:gallery`
- CI currently runs `npm ci`, lint, typecheck, Vitest, installs Chromium with Playwright dependencies, E2E, perf smoke, and build. A separate `ux-gallery` job captures and uploads screenshot artifacts.
- `playwright.config.ts` has desktop, tablet, and narrow-mobile projects. Narrow mobile is scoped to the UX gallery/front-door polish specs.
- The v28 devlog entry documents the UX-screenshot gate: screenshots cover key state × theme × viewport combinations, guard against blank chromatogram screenshots, generate self-contained gallery HTML, and require written UX assessment in the PR template.
- `.github/pull_request_template.md` requires every PR to include the UX gallery artifact, written UX assessment, accessibility checklist, and devlog bookkeeping when a devlog entry is added.
- `docs/research/` already exists with `next-killer-features.md`; `docs/plans/`, `docs/adr/`, and `LEARNINGS.md` were not present in the observed tree.
- `.github/workflows/copilot-setup-steps.yml` was not present in the observed tree, while `.github/workflows/ci.yml` and `deploy-pages.yml` were present.

## Constraints and conventions to preserve

- Keep changes surgical and focused.
- Do not weaken existing guidance; append/tune rather than replacing useful content.
- Keep the app client-side only; do not introduce backend assumptions.
- Preserve GitHub Pages project base path support.
- Use TypeScript and existing modules for parser/rendering changes, though this work should not need parser/rendering changes.
- Keep fixtures/tests synchronized when adding formats; not directly applicable to agent-definition docs.
- UX-affecting work requires all key UX screenshots across desktop/tablet/mobile plus written review. This work is not expected to alter app UX, but the PR template and CI gallery gate still apply.
- Devlog, ADR, and learnings conventions should be left clearer for future agents.
- Avoid attribution or vendor-brand claims in commits, PR text, code, or docs.

## Scaffold / duplication risk

The implementation must build on scaffold PR #43 and must not duplicate scaffold files. Before authoring each `.github/agents/*.md` file, the implementation pass should inventory the scaffolded `.github/agents` filenames and update existing files in place when present. If a required role file is absent, add it once with the canonical kebab-case filename.

Required role files from the work unit:

1. `feature-builder.md`
2. `ui-reviewer.md`
3. `ux-reviewer.md`
4. `e2e-test-author.md`
5. `perf-auditor.md`
6. `opinionated-user-tester.md` with a bench-scientist persona
7. `docs-devlog-writer.md`

## Recommended custom-agent structure

Each agent definition should be concise and role-specialized, with consistent sections so future reviewers can verify completeness quickly:

- Purpose
- When to use
- When not to use
- Tools to prefer
- Domain guardrails
- Workflow
- Definition of Done

The Definition of Done should be role-specific but should consistently reinforce:

- Small, focused PRs.
- No scope reduction without calling out blockers.
- Existing behavior preserved unless intentionally changed.
- Exact validation commands and actual output for implementation tasks.
- UX screenshots/written assessment for UX-affecting changes.
- Devlog/ADR/LEARNINGS updates when relevant.

## Role-specific research notes

### feature-builder

Needs to drive small feature implementation in the TypeScript/client-side app. It should prefer existing modules, fixture-driven parser tests, direct behavior tests, and avoid backend or deployment assumptions. Definition of Done should include tests that fail without the feature and full validation.

### ui-reviewer

Needs to review visual implementation quality: hierarchy, responsive layout, design tokens, contrast, focus states, motion, GitHub Pages base path safety, and consistency with shipped UI. It should use screenshot evidence and code inspection, not personal taste alone.

### ux-reviewer

Needs to judge whether the workflow is great for bench scientists doing Sanger review under time pressure. It should use the v28 UX gallery artifact, the written assessment template, and concrete state/theme/viewport evidence.

### e2e-test-author

Needs to create true-user Playwright coverage using existing helpers and projects. It should cover desktop, tablet, and narrow-mobile where relevant, avoid brittle timing, assert real chromatogram/canvas behavior, and preserve deterministic sample routing patterns.

### perf-auditor

Needs to inspect bundle/runtime/rendering risks and validate with existing perf smoke/build commands. It should pay special attention to chromatogram rendering, large trace workflows, canvas loops, parsing, memory, and no-server constraints.

### opinionated-user-tester

Needs to act as a bench scientist persona: impatient, practical, focused on whether the tool answers “is my sequence usable / did my cloning work / can I share proof?” It should report friction in plain language with concrete screenshots/states and severity.

### docs/devlog-writer

Needs to update human-voice devlog, ADR, LEARNINGS, README/guidance where appropriate, plus `vite.config.ts` and `blog/index.html` when new blog entries are added. It should avoid hype, preserve useful history, and make decisions easy for the next contributor to find.

## ADR recommendation

Add a real ADR under `docs/adr/`, likely `docs/adr/2026-07-05-agentic-development-setup.md`, with:

- Status: Accepted
- Context: sanger-viewer is a fast-moving browser-native Sanger tool that needs small, CI-green, role-specialized work.
- Decision: keep domain-tuned global guidance plus focused `.github/agents/*.md` roles, setup steps with dependency/browser installation, and repo learning loops through devlog/ADR/LEARNINGS.
- Consequences: better delegation and review quality; maintenance burden when commands/conventions change; every future agent should update guidance when it learns durable repo facts.

## Verification strategy for implementation

- Static verification: inspect required files and confirm every required agent has Purpose, When to use, tool selection, and Definition of Done.
- Guidance verification: confirm `AGENTS.md` and `.github/copilot-instructions.md` mention app purpose, bench-scientist audience, TypeScript/client-side/GitHub Pages stack, exact commands, UX-screenshot gate, small PR/devlog/ADR/LEARNINGS conventions, and Definition of Done.
- Setup verification: confirm `.github/workflows/copilot-setup-steps.yml` has a single `copilot-setup-steps` job, `timeout-minutes` no more than 59, dependency install, and Playwright browser installation.
- Documentation verification: confirm `docs/adr/` exists with the agentic-development ADR and `LEARNINGS.md` exists or is updated with the convention.
- Regression verification: run the repository’s existing validation commands and paste actual output in the implementation PR.
- Test verification: add or update a lightweight repository test that would fail if required agent files/sections or guidance conventions are missing.

