# Implementation plan — role-specialized GitHub agents for UX-leadership push

Date: 2026-07-06  
Owner: repository automation  
Work unit: enable tailored `.github/agents/*.md` custom-agent definitions and tune repository instructions for the UX-leadership push.

## Goal

Create a small, focused enablement PR that adds role-specialized custom-agent instructions and updates shared repository guidance so future parallel cloud-agent PRs consistently ship small, CI-green, screenshot-gated, devlog-updated improvements grounded in competitor benchmarking, accessibility, performance, and power-feature preservation.

This is a documentation/configuration change only. It should not change app runtime behavior.

## Files to change

1. Create `.github/agents/ux-designer.md`
2. Create `.github/agents/accessibility.md`
3. Create `.github/agents/performance.md`
4. Create `.github/agents/test-author.md`
5. Create `.github/agents/code-reviewer.md`
6. Create `.github/agents/devlog-writer.md`
7. Update `AGENTS.md`
8. Update `.github/copilot-instructions.md`
9. Add one devlog entry under `blog/2026-07-06-v31-agent-enablement/index.html` or the next available sequence number
10. Update `blog/index.html` to list the devlog entry
11. Update `vite.config.ts` so the new devlog entry is emitted in production builds
12. Optionally update `LEARNINGS.md` if implementation discovers durable workflow gotchas not already captured
13. Optionally update `CHANGELOG.md` under `[Unreleased]` if maintainers want contributor-facing enablement changes listed

## Step-by-step approach

1. Confirm current repository state.
   - Check whether `.github/agents/` already exists.
   - If any target agent files already exist, read them and update surgically rather than replacing them wholesale.
   - Confirm the next devlog sequence number from `blog/index.html`.

2. Draft shared guidance updates.
   - Expand `AGENTS.md` from the current three-item workflow into a concise repo-wide workflow for small UX-leadership PRs.
   - Preserve existing requirements: run validation after code changes, keep changes surgical, preserve GitHub Pages base path support.
   - Add gates for competitor research, UX gallery, devlog updates, accessibility, performance budgets, power-feature preservation, and no model/tool attribution.
   - Keep wording actionable and short to avoid instruction bloat.

3. Draft `.github/copilot-instructions.md` updates.
   - Preserve TypeScript/parser/rendering guidance.
   - Add domain-specific reminders for Sanger viewer work: client-side only, reuse design tokens/components, keep fixtures/tests in sync, screenshot-gate UI changes, update devlog, and preserve existing features.
   - List the validation command set agents should consider: lint, typecheck, unit tests, E2E, UX gallery, perf smoke, and build.

4. Create `.github/agents/ux-designer.md`.
   - Scope: UI/UX direction and screenshot review for small PRs.
   - Require grounding in existing design research and competitor benchmark artifacts.
   - Require evaluation of first-run flow, empty/loading/error states, cohesive tokens, light/dark parity, narrow mobile, delight, and feature preservation.
   - Output: concise UX verdict, prioritized fixes, screenshot states reviewed, and explicit acceptance checklist.

5. Create `.github/agents/accessibility.md`.
   - Scope: WCAG 2.1 AA review and implementation guidance.
   - Require keyboard operability, focus management, contrast, ARIA semantics, reduced motion, touch targets, and narrow-mobile behavior.
   - Require tests or measurable evidence for changed UI.
   - Output: pass/fail checklist, blockers, and exact files/tests reviewed.

6. Create `.github/agents/performance.md`.
   - Scope: performance-sensitive review and implementation guidance.
   - Anchor to the v17 perf audit and current perf harness.
   - Require pan/zoom smoothness, large real-file behavior, no unnecessary recomputation, and budget evidence.
   - Output: before/after command results, budget status, hotspots touched, and regression risk.

7. Create `.github/agents/test-author.md`.
   - Scope: authoring tests that fail without the change.
   - Require direct coverage of new behavior, edge/error paths, fixtures for parser/rendering changes, Playwright coverage for UI states, and no skipped/stubbed tests.
   - Output: tests added/updated, failure mode covered, commands run.

8. Create `.github/agents/code-reviewer.md`.
   - Scope: high-signal review only.
   - Focus on correctness, regressions, security/privacy, accessibility/performance gates, power-feature preservation, devlog/UX-gallery completeness, and CI evidence.
   - Avoid style-only comments and avoid broad rewrites.
   - Output: blocking issues only, with evidence and suggested minimal fix.

9. Create `.github/agents/devlog-writer.md`.
   - Scope: maintain devlog entries for shipped PRs.
   - Require concise HTML matching existing `blog/*/index.html` style.
   - Require updates to `blog/index.html` and `vite.config.ts` for new entries.
   - Require documenting shipped changes, validation evidence, UX-gallery findings, accessibility/performance notes, and follow-ups.

10. Add the enablement devlog entry.
    - Keep it docs/config-focused.
    - Explain what role agents were added, which shared rules were tuned, and how future PRs should use them.
    - Mention no runtime behavior changed.

11. Validate docs/config changes.
    - Run `npm run lint`.
    - Run `npm run typecheck`.
    - Run `npm run test`.
    - Run `npm run build` because a new devlog entry and `vite.config.ts` input are changed.
    - Run `npm run ux:gallery` only if the PR changes UI/runtime behavior; otherwise document why it is not applicable for docs/config-only changes. If house rules require it regardless, run it and attach/review the artifact.
    - Run `npm run perf:smoke` if performance guidance or perf harness files are touched; otherwise document no runtime/perf path changed.
    - Run secret scanning on all changed files before commit.

12. Commit as a small focused PR.
    - Commit message suggestion: `Add UX leadership agent enablement docs`.
    - PR description should follow `.github/pull_request_template.md`.
    - For the UX assessment, state that runtime UI is unchanged, link the UX gallery artifact if generated, and note there are no screenshot-visible app changes.

## Key risks and mitigations

- Risk: Overwriting existing custom-agent definitions. Mitigation: inspect `.github/agents/` first and update surgically.
- Risk: Instruction bloat makes future agents slower or inconsistent. Mitigation: keep shared guidance concise and role files focused.
- Risk: Role files contradict each other. Mitigation: centralize shared gates in `AGENTS.md` / `.github/copilot-instructions.md`; make role files additive.
- Risk: Devlog entry is not included in production build. Mitigation: update both `blog/index.html` and `vite.config.ts`, then run `npm run build`.
- Risk: CI matrix expectations diverge from actual workflow. Mitigation: phrase instructions as “check the current workflow matrix and keep all configured jobs green,” while preserving the mission requirement for Windows/full-matrix readiness.
- Risk: Future agents treat screenshot review as optional for docs/config-only PRs. Mitigation: clarify when UX gallery is mandatory for visual/runtime UI changes and how to document not-applicable cases.

## Acceptance-criterion verification plan

1. COMPETITOR-BENCHMARKED
   - Verify `ux-designer.md`, `code-reviewer.md`, `AGENTS.md`, and `.github/copilot-instructions.md` direct agents to ground UX work in `blog/2026-07-04-v17-design-research/`, `blog/2026-07-05-v28-ux-gallery/`, and refreshed `docs/research` competitor-gap assessments.
   - Verify instructions specifically name SnapGene, Benchling, Chromas, FinchTV, and ApE when asking for refreshed benchmark work.

2. FRICTIONLESS FIRST RUN
   - Verify `ux-designer.md` requires review of open-to-rendered-chromatogram, empty/dropzone, sample data, loading, error, and empty states.
   - Verify `test-author.md` asks for direct tests of these states when changed.

3. COHESIVE DESIGN SYSTEM
   - Verify shared instructions and `ux-designer.md` require reuse of existing design tokens/components across panels, light/dark themes, and states.
   - Verify `code-reviewer.md` treats fragmented one-off styling as a review issue.

4. DELIGHT
   - Verify `ux-designer.md` asks for purposeful micro-interactions with reduced-motion behavior and no gratuitous animation.
   - Verify `accessibility.md` checks reduced-motion and focus-visible behavior.

5. ACCESSIBILITY
   - Verify `accessibility.md` requires WCAG 2.1 AA checks for keyboard, focus, contrast, ARIA, reduced motion, touch targets, and narrow-mobile.
   - Verify `test-author.md` prompts E2E or unit tests for changed accessibility behavior.

6. PERFORMANCE
   - Verify `performance.md` anchors work to v17 performance budgets and `npm run perf:smoke`.
   - Verify `code-reviewer.md` flags pan/zoom and large-file regressions.

7. POWER PRESERVED
   - Verify shared instructions and `code-reviewer.md` require checking editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace capabilities for regressions.
   - Verify `test-author.md` encourages regression coverage for affected power features.

8. Every PR CI-green, screenshot-gated, devlog-updated, small, no regressions
   - Verify `AGENTS.md`, `.github/copilot-instructions.md`, `devlog-writer.md`, `test-author.md`, and `code-reviewer.md` all reinforce validation, UX gallery/written assessment, devlog updates, small scope, and no skipped tests.

## Expected final validation evidence for implementation PR

The implementation PR should paste verbatim output for at least:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

If runtime/UI behavior is touched, also paste verbatim output for:

```text
npm run test:e2e
npm run ux:gallery
npm run perf:smoke
```

If the change remains docs/config-only and does not touch runtime UI, explicitly state why E2E, UX gallery, and perf smoke are not behaviorally required, unless the reviewer requires them anyway.
