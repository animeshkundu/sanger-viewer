# Agentic development custom-agent research

Date: 2026-07-05

## Scope

This research note prepares the repository for role-specialized custom-agent definitions that help future work stay focused, small, and CI-green. It is scoped to the sanger-viewer domain: a client-side TypeScript Sanger trace workbench for bench scientists, hosted on GitHub Pages.

## Repository constraints to preserve

- The app stays browser-only and private-by-default; trace parsing, rendering, editing, export, and analysis should keep data on the user's machine unless a feature explicitly asks for an external handoff.
- Production builds use the GitHub Pages base path `/sanger-viewer/`; guidance must call out that base-path support is a release blocker.
- Core validation commands are:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`
  - `npm run perf:smoke`
  - `npm run build`
  - `npm run ux:gallery` for the UX screenshot gate.
- UX-affecting work must capture key UX states across desktop, tablet, and mobile, then include a written review of what is great and what should improve.
- Documentation should leave a trail: devlog for human-readable shipped work, ADRs for durable decisions, and LEARNINGS for reusable repo knowledge.

## Custom-agent role map

| Agent file | Primary purpose | Use when | Tool focus | Definition of Done |
|---|---|---|---|---|
| `feature-builder.md` | Ship small Sanger viewer feature slices end-to-end. | A product behavior, parser/rendering capability, export path, or workspace interaction needs implementation. | Code search, TypeScript tests, targeted Playwright, lint/typecheck/test/build. | Behavior is implemented with focused tests, no unrelated churn, privacy and Pages base path preserved, validation is green, devlog/ADR/LEARNINGS updated when applicable. |
| `ui-reviewer.md` | Inspect visual/UI implementation quality. | A PR changes layout, controls, tokens, canvas presentation, responsive states, focus styling, or visual hierarchy. | Browser screenshots, Playwright UX gallery artifacts, CSS/DOM inspection, accessibility checks. | All key states are reviewed at desktop/tablet/mobile, regressions are filed with exact selectors/screens, and the UX-screenshot gate expectations are satisfied. |
| `ux-reviewer.md` | Judge whether the workflow feels clear for bench scientists. | A PR affects first impression, trace inspection, edit/review flows, export, alignment, assembly, or clone-screening decisions. | True-user walkthroughs, screenshot review, accessibility heuristics, domain task narratives. | Review answers “is this great UX?”, names concrete improvements, and verifies the shipped flow works for a bench-scientist task without hidden developer assumptions. |
| `e2e-test-author.md` | Add or strengthen true-user Playwright coverage. | Behavior needs browser-level proof, especially drag/drop, keyboard/touch, canvas interactions, export/downloads, or responsive behavior. | Existing Playwright config/projects, fixtures, `data-testid` selectors, screenshot/UX gallery conventions. | Tests are deterministic, fixture-backed, run in the relevant projects, avoid brittle timing, and cover the user-visible acceptance criteria. |
| `perf-auditor.md` | Protect rendering, parsing, and interaction performance. | Work touches chromatogram rendering, viewport math, workers/parsers, large fixtures, consensus/alignment, or hot interaction loops. | Perf smoke tests, large fixtures, browser profiling when needed, bundle/build checks. | Impact is measured or bounded, hot paths avoid avoidable allocations, large-trace behavior remains usable, and any new budget or risk is documented. |
| `opinionated-user-tester.md` | Run a bench-scientist persona review. | A feature claims to improve wet-lab workflows, interpretation confidence, handoff/export, or first-use clarity. | End-to-end app walkthroughs, screenshots, copy review, workflow critique. | Feedback is candid, task-oriented, names confusing moments, and produces actionable fixes or follow-up notes. |
| `docs/devlog-writer.md` | Keep durable written trail in the repo. | A PR changes behavior, conventions, architecture, testing gates, or development process. | Docs search, devlog HTML pattern, ADR/LEARNINGS conventions, Vite blog inputs. | Devlog entry reads in a human voice, ADR records durable decisions, LEARNINGS captures reusable facts, and Vite includes new published devlog pages. |

## Guidance implications

Future guidance should be direct and domain-tuned rather than generic:

1. State the product and audience first: sanger-viewer is for bench scientists validating Sanger traces quickly and privately.
2. Route work to the narrowest role that can finish it well; use reviewers for critique and builders for changes.
3. Treat the UX-screenshot gate as part of done for any user-facing change, not a late optional artifact.
4. Keep setup deterministic: install dependencies and Playwright browsers before agent work so build, unit, E2E, perf, and screenshot checks are available immediately.
5. Keep PRs small; if a request mixes setup, agent definitions, and app behavior, split the work rather than weakening validation.

## Open implementation checks

- Confirm the setup workflow job remains named `copilot-setup-steps`, uses `timeout-minutes` no greater than 59, and installs Playwright browsers after `npm ci`.
- Confirm custom-agent definitions each include purpose, when-to-use, explicit tool selection, and Definition of Done.
- Confirm guidance files do not remove existing instructions while adding the sanger-viewer domain details.
- Confirm docs updates include at least one ADR and, when behavior or process changes ship, a devlog entry.
