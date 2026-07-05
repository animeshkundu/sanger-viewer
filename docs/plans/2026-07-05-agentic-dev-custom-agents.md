# Implementation plan: role-specialized custom agents

Date: 2026-07-05

## Goal

Prepare a small, CI-green change set that introduces role-specialized custom-agent guidance for sanger-viewer without weakening the existing scaffold or duplicating unrelated files.

## Non-goals

- Do not change app behavior, parser logic, renderer logic, or fixtures in this work unit.
- Do not loosen validation, UX-screenshot requirements, or GitHub Pages base-path behavior.
- Do not bundle large future product work into the agentic-dev setup PR.

## File plan

1. Create focused custom-agent definitions:
   - `feature-builder.md`
   - `ui-reviewer.md`
   - `ux-reviewer.md`
   - `e2e-test-author.md`
   - `perf-auditor.md`
   - `opinionated-user-tester.md`
   - `docs/devlog-writer.md`
2. Domain-tune repository guidance:
   - `AGENTS.md`
   - `.github/copilot-instructions.md`
3. Ensure cloud-agent setup is deterministic:
   - `.github/workflows/copilot-setup-steps.yml`
4. Document the decision:
   - `docs/adr/2026-07-05-agentic-development-setup.md`
   - `LEARNINGS.md`
   - Devlog entry plus `blog/index.html` and `vite.config.ts` input when publishing a new devlog page.

## Custom-agent template

Each custom-agent file should use the same tight structure:

```markdown
# <role name>

## Purpose

<One paragraph describing the role's narrow responsibility.>

## When to use

- <Concrete trigger>
- <Concrete trigger>

## Tools to prefer

- <Tool or command category>
- <Tool or command category>

## Definition of Done

- <Required outcome>
- <Required validation>
- <Required documentation or handoff>
```

## Role details to implement

### feature-builder

- Purpose: implement small TypeScript feature slices for parser, rendering, workspace, export, or analysis behavior.
- Use when: the requested outcome needs code changes and tests.
- Tools: code search, focused unit tests, relevant Playwright tests, lint/typecheck/test/build.
- Done: user-visible behavior is implemented, focused tests cover it, privacy and base path are preserved, and docs are updated only when directly relevant.

### ui-reviewer

- Purpose: review visual implementation quality and UI regressions.
- Use when: layout, tokens, focus, canvas presentation, responsive behavior, or screenshots change.
- Tools: Playwright screenshots, UX gallery, DOM/CSS inspection, accessibility checks.
- Done: desktop/tablet/mobile states are reviewed with exact findings and UX-screenshot gate readiness is clear.

### ux-reviewer

- Purpose: evaluate whether the workflow is genuinely clear for bench scientists.
- Use when: first impression, trace review, editing, export, alignment, assembly, or clone-screen flows change.
- Tools: true-user walkthroughs, screenshot review, keyboard/touch checks, task narratives.
- Done: review answers what is great, what blocks confidence, and what to improve next.

### e2e-test-author

- Purpose: author deterministic Playwright coverage for user-visible behavior.
- Use when: behavior requires browser proof or crosses DOM, canvas, file, keyboard, touch, download, or responsive boundaries.
- Tools: existing Playwright projects, fixtures, stable selectors, route stubbing, artifact review.
- Done: tests are stable, fixture-backed, targeted, and run in the needed viewport/project set.

### perf-auditor

- Purpose: protect parse/render/interaction performance.
- Use when: large traces, workers, canvas loops, viewport math, consensus, alignment, or bundle-sensitive code changes.
- Tools: perf smoke tests, large fixtures, targeted profiling, build output.
- Done: risk is measured or bounded, hot paths are reviewed, and follow-ups are documented if needed.

### opinionated-user-tester

- Purpose: critique the app as a demanding bench scientist.
- Use when: a feature should make real wet-lab trace inspection faster, clearer, or more trustworthy.
- Tools: walkthroughs, screenshots, copy review, domain task checklists.
- Done: feedback is practical, candid, and translated into fixes or follow-up issues.

### docs/devlog-writer

- Purpose: keep the repo's written memory useful.
- Use when: a PR changes behavior, process, architecture, test gates, or product direction.
- Tools: docs search, devlog HTML patterns, ADR format, LEARNINGS, Vite blog inputs.
- Done: human-voice devlog is updated, durable decisions are in ADRs, reusable facts are in LEARNINGS, and published pages are included in the Vite build.

## Validation plan

Because this work is documentation and setup-oriented, run the standard repo validation after edits:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If setup workflow or E2E-related instructions change, also run:

```bash
npm run test:e2e
npm run perf:smoke
npm run ux:gallery
```

## Review checklist

- [ ] No existing guidance is removed or weakened.
- [ ] Each custom-agent definition has purpose, when-to-use, tools, and Definition of Done.
- [ ] Guidance names bench scientists, client-side TypeScript, GitHub Pages, exact commands, UX-screenshot gate, small PRs, devlog, ADR, LEARNINGS, and Definition of Done.
- [ ] Setup job is named `copilot-setup-steps`, has `timeout-minutes <= 59`, runs `npm ci`, and installs Playwright browsers.
- [ ] ADR and LEARNINGS capture the durable decision.
- [ ] CI-equivalent validation is green.
