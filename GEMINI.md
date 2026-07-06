# Repository guidance for animeshkundu/sanger-viewer

## Project overview

<!-- TODO: fill in project overview, goals, users, and boundaries. -->

## Tech stack

<!-- TODO: fill in languages, frameworks, package managers, services, and runtime versions. -->

## Build/run

<!-- TODO: fill in setup, build, run, and local development commands. -->

## Test & validate

<!-- TODO: fill in repository-specific validation commands and required checks. -->

Use this Definition of Done gate before opening or merging changes:

- Build, typecheck, lint, and test commands pass, or unavailable commands are explicitly documented.
- Acceptance criteria are verified against the changed behavior.
- Security-sensitive changes receive focused review.
- Documentation and learnings are updated when behavior or process changes.

## Conventions

<!-- TODO: fill in coding style, naming, formatting, dependency, and review conventions. -->

## Project structure

<!-- TODO: fill in the important directories, ownership boundaries, and generated-file locations. -->

## Security

<!-- TODO: fill in secret-handling, dependency, data-retention, and permission rules. -->

## PR/commit rules

<!-- TODO: fill in branch naming, commit message, PR description, review, and merge rules. -->

## Gotchas/learnings

<!-- TODO: fill in surprising constraints, past incidents, and durable project learnings. -->

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
