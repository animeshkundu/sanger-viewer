# Plan: domain-tune agent guidance and cloud setup

Date: 2026-07-05

## Goal

Prepare a small, CI-green implementation PR that improves future cloud-agent work for sanger-viewer by domain-tuning repository guidance, adding deterministic cloud setup for Playwright E2E, and documenting the new conventions through LEARNINGS, ADR, and devlog artifacts.

## Files to change

1. `AGENTS.md`
2. `.github/copilot-instructions.md`
3. `.github/workflows/copilot-setup-steps.yml`
4. `LEARNINGS.md`
5. `docs/adr/0001-agentic-development-setup.md` (create `docs/adr/`)
6. `blog/2026-07-05-v30-agentic-dev-setup/index.html`
7. `blog/index.html`
8. `vite.config.ts` (only to include the new devlog page in the GitHub Pages build)

## Step-by-step implementation

1. Confirm the branch is based on the scaffold work intended by PR #43 and start with a clean working tree.
2. Re-open current `AGENTS.md`, `.github/copilot-instructions.md`, `package.json`, CI workflow, PR template, Playwright config, and UX gallery spec to avoid drifting from actual commands and conventions.
3. Expand `AGENTS.md` without removing existing points:
   - Identify the app as a client-side TypeScript/Vite Sanger trace viewer for bench scientists.
   - State that the live GitHub Pages app must keep `/sanger-viewer/` base-path compatibility.
   - List exact validation commands: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, `npm run build`, and `npm run ux:gallery` when UX is affected.
   - Add small-PR discipline and require devlog, ADR, and LEARNINGS updates when conventions or durable behavior change.
   - Add the UX-screenshot gate: all key UX states across desktop, tablet, and mobile plus written UX assessment for UX-affecting work.
   - Add a concise Definition of Done aligned with the problem statement.
4. Expand `.github/copilot-instructions.md` without weakening current parser/rendering guidance:
   - Domain context and target audience.
   - Tooling/stack summary: TypeScript, Vite, client-side only, GitHub Pages, Vitest, Playwright.
   - Exact build/test/lint/E2E commands.
   - UX gallery gate and PR-template expectations.
   - Devlog, ADR, and LEARNINGS expectations.
   - Definition of Done and explicit “no skipped/stubbed tests, no silent scope reduction” guidance.
5. Create `.github/workflows/copilot-setup-steps.yml`:
   - `name: Copilot Setup Steps`.
   - Trigger with `workflow_dispatch`, plus `push`/`pull_request` path filters for the setup workflow and lockfiles.
   - Single job named exactly `copilot-setup-steps`.
   - `runs-on: ubuntu-latest`.
   - `timeout-minutes: 59` or lower.
   - `permissions: contents: read`.
   - Steps: checkout, setup Node.js 22 with npm cache, `npm ci`, cache Playwright browser directory if useful, and `npx playwright install --with-deps chromium`.
6. Create `LEARNINGS.md`:
   - Define the purpose of the file.
   - Add at least one real learning from this work: future cloud-agent sessions need both `npm ci` and Playwright Chromium with OS dependencies preinstalled to run true-user E2E/UX gallery checks reliably.
   - Add a convention for keeping entries concise, dated, and actionable.
7. Create `docs/adr/0001-agentic-development-setup.md`:
   - Record the decision to centralize domain guidance in `AGENTS.md`/`.github/copilot-instructions.md`, use role-specialized custom agents from the scaffold, and preinstall npm dependencies plus Playwright Chromium in `copilot-setup-steps.yml`.
   - Include context, decision, consequences, and verification.
8. Add a devlog page at `blog/2026-07-05-v30-agentic-dev-setup/index.html` in the existing human-voice style:
   - Explain what changed and why it helps future work.
   - Mention that this is process/setup work, not product UI behavior.
   - Include verification performed.
9. Update `blog/index.html` with the new entry near the top.
10. Update `vite.config.ts` with one Rollup input for the new devlog page, preserving existing GitHub Pages behavior.
11. Run formatting/lint-relevant checks if the edited HTML/TS files require it.
12. Run the full validation suite and capture verbatim output:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test`
    - `npm run test:e2e`
    - `npm run perf:smoke`
    - `npm run build`
13. Run `npm run ux:gallery` if the implementation is judged UX-affecting by the PR template or if reviewers require the gallery for every PR.
14. Verify each acceptance criterion one by one and document the result in the final response.
15. Scan changed files for secrets before committing.
16. Run the required parallel validation tool before finalizing if implementation changes are made.
17. Commit and push via the provided progress-reporting mechanism; do not open a PR unless explicitly asked.

## Acceptance-criterion verification plan

1. `.github/agents/` custom agents exist and remain focused.
   - This work unit does not change `.github/agents/`.
   - Verify the implementation did not delete or weaken scaffold-provided custom-agent files.
   - If repository access rules prevent reading those files, report that limitation explicitly and keep the work scoped to guidance/setup/docs.
2. `AGENTS.md` and `.github/copilot-instructions.md` are domain-tuned.
   - Check both files mention: app purpose, bench-scientist audience, TypeScript/client-side/GitHub Pages stack, exact validation commands, UX-screenshot gate, small PRs, devlog, ADR/LEARNINGS, and Definition of Done.
   - Confirm existing guidance was preserved or strengthened.
3. `.github/workflows/copilot-setup-steps.yml` installs dependencies and Playwright browsers.
   - Check the job is named exactly `copilot-setup-steps`.
   - Check `timeout-minutes <= 59`.
   - Check the workflow runs `npm ci` and `npx playwright install --with-deps chromium`.
   - Prefer Node.js 22 to match CI.
4. `docs/adr` and `LEARNINGS.md` are populated.
   - Confirm `docs/adr/0001-agentic-development-setup.md` exists and records the setup decision.
   - Confirm `LEARNINGS.md` exists and includes at least one dated, actionable learning.
5. CI green and devlog updated.
   - Confirm full local validation commands pass and paste verbatim output.
   - Confirm `blog/2026-07-05-v30-agentic-dev-setup/index.html`, `blog/index.html`, and `vite.config.ts` are updated consistently.

## Key risks

- Scope creep: the work unit is guidance/setup/docs only, so avoid product-code changes.
- Setup-workflow drift: use Node.js 22 and Chromium because that matches existing CI.
- Devlog build regression: every new devlog HTML page must be listed in `vite.config.ts`.
- UX gate ambiguity: the PR template says every PR must include UX gallery evidence, while this work is not product UX. Be prepared to run `npm run ux:gallery` anyway or explain why screenshots are unchanged.
- Test requirement ambiguity: adding behavior tests for docs/workflow guidance may be artificial. Do not create meaningless tests; report this clearly if required.
