## Summary

<!-- What does this PR change and why? -->

## UX Gallery

<!-- MANDATORY: Every PR must include a UX gallery and written UX assessment. -->

The UX gallery screenshots for this PR are available as a **downloadable CI artifact**
(`ux-gallery` artifact in the Actions run for this PR). Open `index.html` to browse all
captures grouped by state → theme → viewport.

### Written UX Assessment

<!-- Answer ALL of the following. This section is examined by the Copilot reviewer
     and required for merge. Be specific and grounded in evidence from the screenshots. -->

**Is this great UX?**
<!-- 2–4 sentences: overall verdict on the UX quality of the changes in this PR. -->

**What specifically needs to improve?**
<!-- List the top 2–5 concrete, actionable UX issues visible in the gallery screenshots,
     grounded in the design-research heuristics (visual hierarchy, progressive disclosure,
     measured a11y, consistency, delight). Include state/theme/viewport references. -->

**Accessibility measurements (for changes touching visual design or layout):**
- [ ] Text contrast ≥ 4.5 : 1 (WCAG AA)
- [ ] UI / border contrast ≥ 3 : 1
- [ ] Focus rings visible in keyboard-focus screenshots
- [ ] Keyboard operable (all interactive elements reachable via Tab / Arrow)

**Follow-up issues filed:** <!-- Link any scoped follow-up issues for deferred improvements -->

---

## Checklist

- [ ] `npm run lint && npm run typecheck && npm run test` pass
- [ ] `npm run test:e2e` passes (all desktop + tablet + narrow-mobile projects)
- [ ] UX gallery CI artifact generated and reviewed
- [ ] Written UX assessment completed above
- [ ] No capability regressions
- [ ] `vite.config.ts` updated if a new devlog entry was added
- [ ] `blog/index.html` updated if a new devlog entry was added
