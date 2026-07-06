# Copilot instructions

- Use TypeScript and existing modules for parser and rendering changes.
- Keep parser fixtures and tests in sync when adding formats.
- Run `npm run lint && npm run typecheck && npm run test` before finalizing.
- For UX/UI work, start from `docs/research/2026-07-06-enablement-author-tailored-github-agents-md-role-specialized.md`, the v17 design research, the v17 performance audit, and the v28/v29 UX-gallery devlogs.
- Keep PRs small, screenshot-gated, devlog-updated, and independently shippable.
- Reuse existing design tokens/components; do not create one-off styling systems for panels, empty states, loading states, errors, or toolbar controls.
- WCAG 2.1 AA is mandatory: verify keyboard flow, focus management, ARIA, contrast, touch targets, and reduced-motion behavior for changed UI.
- Preserve smooth pan/zoom and large-trace workflows; run `npm run perf:smoke` when rendering or interaction hot paths change.
- Explicitly protect editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace behavior when changing shared UI or state.
- Keep commits, docs, code, and PR copy free of attribution-sensitive wording.
