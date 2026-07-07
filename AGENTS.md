# AGENTS.md

Agent workflow:

1. Run lint/typecheck/tests after code changes.
2. Keep changes surgical and focused on Sanger viewer behavior.
3. Preserve GitHub Pages project base path support.

## Project overview

World-class, high-performance web viewer for Sanger sequencing traces (.ab1/.scf): chromatogram rendering, base calls, quality scores. Client-side, hosted on GitHub Pages.

Default branch: main

## Tech stack

JavaScript/TypeScript (npm), vite

Package manager / build tool: npm

## Commands

Run the closest available command before handing off. If a command is ambiguous, keep the TODO rather than guessing.

- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm run test`

## Definition of Done gate

A change is not ready for review or merge until all applicable checks below are satisfied with real command output in the PR:

- Build passes: `npm run build`
- Typecheck passes: `npm run typecheck`
- Lint passes: `npm run lint`
- Tests pass: `npm run test`
- Tests only go up: features and bug fixes add or strengthen tests; do not delete coverage to make a branch green.
- Acceptance criteria are explicitly verified against the changed behavior.
- No stub, skipped, or TODO-only implementation is counted as done.
- Documentation, ADRs, changelog, and history/learnings are updated in the same PR when behavior, architecture, process, or operational knowledge changes.
- CI is green on the required matrix (ubuntu-latest); branch protection and required checks are the merge gate.
- No attribution to tools or generated authorship appears in commits, PRs, docs, or code comments.
- UI-impacting changes include before/after screenshots or recorded browser evidence in the PR.

## Primary OS and portability

Primary OS: <!-- TODO: choose the primary supported OS. -->

- Treat the primary OS as authoritative when behavior differs.
- Keep path handling portable; avoid shell-specific assumptions in application code.
- Add regression coverage for platform-specific fixes rather than skipping that platform.

## Conventions

- Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
- Keep one concern per PR; split broad or vague work before implementation.
- Prefer small, reviewable changes with explicit acceptance criteria.
- Do not hide failures with retries, skipped tests, relaxed assertions, or platform carve-outs.
- Preserve existing style unless an accepted ADR says otherwise.

## Project structure

- `src/` — <!-- TODO: describe ownership and generated-file rules. -->
- `tests/` — <!-- TODO: describe ownership and generated-file rules. -->
- `docs/` — <!-- TODO: describe ownership and generated-file rules. -->
- `.github/` — <!-- TODO: describe ownership and generated-file rules. -->
- `scripts/` — <!-- TODO: describe ownership and generated-file rules. -->

## Decision records and durable memory

- ADRs live in `docs/adr/` for project-specific decisions; use `docs/adrs/0000-template.md` as the Nygard-style template when the repo uses plural ADR paths.
- Plans live in `docs/plans/YYYY-MM-DD-slug.md`.
- Research lives in `docs/research/YYYY-MM-DD-slug.md` with citations to source files or external URLs.
- Solved problems, incidents, and debugging notes live in `docs/history/YYYY-MM-DD-slug.md`.
- Durable project learnings live in `LEARNINGS.md`; update it when a future contributor would otherwise rediscover the same fact.

## Handoff

Every handoff should include:

- What changed and why.
- Files touched and the important decisions made.
- Commands run with pass/fail results.
- Risks, follow-ups, and any intentionally deferred work.
- Links to PRs, issues, ADRs, plans, research, and history entries.

## Testing

- Framework: Vitest
- Test directory: tests/
- Test file glob: **/*.{test,spec}.{ts,tsx,js,jsx}
- Prefer tests that reproduce real failure modes, not only cooperative mocks.
- Bug fixes include a regression test that fails before the fix.
- Keep tests deterministic and independent; clean up external state.

## Gotchas

- Primary OS was not confidently detected; choose one before relying on OS-specific behavior.
