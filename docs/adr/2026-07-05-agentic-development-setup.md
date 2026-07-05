# ADR: Role-specialized agentic development setup

Date: 2026-07-05

## Status

Accepted

## Context

sanger-viewer is a client-side TypeScript app for bench scientists who need fast, private Sanger trace inspection in the browser. The project already expects small PRs, strong validation, GitHub Pages base-path safety, and UX screenshots for user-facing changes.

Future cloud-agent work will span different responsibilities: feature implementation, visual review, workflow critique, true-user E2E coverage, performance auditing, bench-scientist persona testing, and repo-memory documentation. A single generic instruction set makes it easy to miss one of those responsibilities or to mix too much work into one PR.

## Decision

Use focused custom-agent definitions for the core roles and keep repository guidance domain-specific. Each role definition should include:

- a narrow purpose;
- clear when-to-use triggers;
- explicit tool and command preferences;
- a Definition of Done tied to sanger-viewer validation, UX screenshots, docs, and small-PR discipline.

The setup should also make validation available before work starts by installing dependencies and Playwright browsers in the cloud-agent setup workflow.

## Consequences

- Future tasks can choose a role that matches the work instead of relying on a generic contributor checklist.
- UX-affecting changes keep the screenshot/review gate in the normal flow.
- Development setup becomes more deterministic for lint, typecheck, unit, E2E, performance, build, and UX-gallery validation.
- The repo should keep this decision current through ADRs, LEARNINGS, and human-readable devlog entries when conventions evolve.
