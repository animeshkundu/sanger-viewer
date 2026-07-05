# Plan: author role-specialized GitHub agent definitions

Date: 2026-07-05

## Scope

Implement the work unit as a small documentation/configuration PR on top of scaffold PR #43. The goal is to author or complete the required `.github/agents/*.md` role definitions and add a real ADR for the agentic-development setup decision, while preserving scaffold content and keeping CI green.

## Files to change

Primary work-unit files:

- `.github/agents/feature-builder.md`
- `.github/agents/ui-reviewer.md`
- `.github/agents/ux-reviewer.md`
- `.github/agents/e2e-test-author.md`
- `.github/agents/perf-auditor.md`
- `.github/agents/opinionated-user-tester.md`
- `.github/agents/docs-devlog-writer.md`
- `docs/adr/2026-07-05-agentic-development-setup.md`

Likely supporting files to verify or tune only if scaffold PR #43 has not already satisfied them:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/workflows/copilot-setup-steps.yml`
- `LEARNINGS.md`
- `blog/index.html`
- `blog/2026-07-05-<agentic-dev-entry>/index.html`
- `vite.config.ts` if a new devlog entry is added
- A lightweight docs/config test, for example under `tests/core/` or another existing Vitest-included path, to verify required guidance files and sections exist

## Step-by-step implementation plan

1. Start from the current branch that contains scaffold PR #43.
2. Inspect the existing `.github/agents/` directory before writing anything.
   - If a required role file already exists, update it in place.
   - If a required role file is missing, add it once with the canonical filename listed above.
   - Do not create alternate names or duplicate scaffold files.
3. Inventory existing guidance/config docs.
   - Read `AGENTS.md`, `.github/copilot-instructions.md`, `.github/workflows/copilot-setup-steps.yml`, `LEARNINGS.md`, existing `docs/adr/` entries, and latest devlog entries.
   - Note any scaffold content that must be preserved.
4. Define a shared custom-agent template.
   - Use consistent sections: Purpose, When to use, When not to use, Tools to prefer, Domain guardrails, Workflow, Definition of Done.
   - Keep each definition tight and role-specific.
   - Include explicit tool-selection guidance without encouraging unnecessary edits or broad rewrites.
5. Author `feature-builder.md`.
   - Focus on small TypeScript/client-side feature work.
   - Require direct tests that fail without the feature, existing module reuse, full validation output, devlog/ADR/LEARNINGS updates when relevant, and GitHub Pages base-path preservation.
6. Author `ui-reviewer.md`.
   - Focus on visual implementation quality, responsive layout, design consistency, focus states, contrast, motion, and screenshot-evidence review.
   - Make it review-only unless explicitly asked to implement fixes.
7. Author `ux-reviewer.md`.
   - Focus on the bench-scientist workflow: can users open, inspect, decide, export/share, and recover from errors quickly?
   - Require use of UX gallery artifacts and written state/theme/viewport observations.
8. Author `e2e-test-author.md`.
   - Focus on Playwright true-user tests, deterministic sample handling, desktop/tablet/narrow-mobile coverage when relevant, non-blank chromatogram assertions, accessibility/touch/keyboard paths, and avoiding brittle waits.
9. Author `perf-auditor.md`.
   - Focus on parser/rendering/workspace performance, bundle/build impact, canvas hot paths, memory risks, large traces, and existing perf smoke/build validation.
10. Author `opinionated-user-tester.md`.
    - Use a bench-scientist persona that is direct, practical, and skeptical.
    - Require concrete friction reports grounded in screenshots or observable workflow steps, with severity and recommended next action.
11. Author `docs-devlog-writer.md`.
    - Focus on human-voice devlog entries, ADR/LEARNINGS upkeep, README/guidance updates, and `vite.config.ts`/`blog/index.html` bookkeeping for new devlog pages.
12. Add the ADR.
    - Create `docs/adr/` if needed.
    - Add `docs/adr/2026-07-05-agentic-development-setup.md` with Status, Context, Decision, Consequences, and Verification sections.
    - Capture why this repository uses role-specialized agents plus domain-tuned guidance/setup.
13. Tune broader guidance only if needed to meet acceptance criteria.
    - Ensure `AGENTS.md` and `.github/copilot-instructions.md` mention what the app is, target bench-scientist audience, TypeScript/client-side/GitHub Pages stack, exact commands, UX-screenshot gate, small-PR/devlog/ADR/LEARNINGS conventions, and Definition of Done.
    - Preserve all existing guidance and strengthen rather than replace it.
14. Tune setup workflow only if needed to meet acceptance criteria.
    - Ensure `.github/workflows/copilot-setup-steps.yml` uses a single `copilot-setup-steps` job, `timeout-minutes` <= 59, `npm ci`, and Playwright browser installation such as `npx playwright install --with-deps chromium`.
15. Populate `LEARNINGS.md` conventions if missing or incomplete.
    - Keep it concise and durable: what future agents should learn from this setup and when to update the file.
16. Update devlog if the implementation PR changes repository conventions.
    - Add a human-voice devlog entry only if appropriate for this convention/setup change.
    - If adding a devlog entry, update `blog/index.html` and `vite.config.ts` so GitHub Pages emits it.
17. Add a failing-without-change test.
    - Prefer a lightweight Vitest test that reads required guidance files and asserts all required agent files exist with required sections.
    - Include checks for exact validation command strings and setup-step essentials if those files are part of the PR.
18. Run validation locally and keep actual output.
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test`
    - `npm run test:e2e`
    - `npm run perf:smoke`
    - `npm run build`
    - If UX/devlog/gallery behavior changed, also run `npm run ux:gallery` or the relevant gallery command.
19. Verify acceptance criteria one by one.
    - Required role-specialized agent definitions exist and contain tight purpose, when-to-use, explicit tool selection, and Definition of Done.
    - `AGENTS.md` and `.github/copilot-instructions.md` are domain-tuned and preserve existing content.
    - `copilot-setup-steps.yml` installs dependencies and Playwright browsers within the allowed job shape/time limit.
    - `docs/adr/` and `LEARNINGS.md` conventions are populated with a real ADR for this decision.
    - Devlog is updated if required and CI-relevant commands pass.
20. Commit as a small PR with no attribution/vendor-brand wording in commit, docs, or PR body.

## Key risks

- Duplicating scaffold PR #43 files instead of updating them in place.
- Making custom-agent definitions too broad, causing future agents to overlap rather than specialize.
- Weakening existing guidance by replacing short useful instructions instead of extending them.
- Forgetting that new devlog pages must be added to both `blog/index.html` and `vite.config.ts`.
- Treating the UX gallery gate as optional; every PR still needs the CI artifact and written assessment in the PR template.
- Adding a setup workflow with an invalid job name or timeout above 59 minutes.
- Omitting Playwright browser installation, leaving future cloud-agent E2E work flaky or slow.
- Creating docs/config without tests, which would fail the task’s Definition of Done requirement for tests that fail without the change.

## Acceptance-criterion verification checklist

1. `.github/agents/` role definitions
   - Verify the seven required files exist.
   - Verify each has Purpose, When to use, explicit tool selection, and Definition of Done.
   - Verify `opinionated-user-tester.md` clearly uses a bench-scientist persona.
2. Domain-tuned guidance
   - Verify `AGENTS.md` and `.github/copilot-instructions.md` describe the app, audience, stack, exact commands, UX-screenshot gate, small-PR/devlog/ADR/LEARNINGS conventions, and Definition of Done.
   - Verify existing content was not removed or weakened.
3. Cloud-agent setup
   - Verify `.github/workflows/copilot-setup-steps.yml` has job `copilot-setup-steps`, `timeout-minutes` <= 59, dependency install, and Playwright browser installation.
4. ADR and learnings
   - Verify `docs/adr/2026-07-05-agentic-development-setup.md` exists and captures the decision.
   - Verify `LEARNINGS.md` exists or is updated with durable conventions.
5. CI/devlog
   - Verify the full validation commands pass and paste actual output in the implementation summary.
   - Verify devlog updates are present if the implementation changes repo conventions, with `blog/index.html` and `vite.config.ts` updated for any new entry.
6. Definition of Done
   - Verify tests were added and would fail without the required files/sections.
   - Verify no tests were skipped/stubbed/disabled.
   - Verify blockers are reported explicitly instead of silently reducing scope.

