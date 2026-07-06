# AGENTS.md

Agent workflow:

1. Run lint/typecheck/tests after code changes.
2. Keep changes surgical and focused on Sanger viewer behavior.
3. Preserve GitHub Pages project base path support.
4. Ground UX/UI work in the competitor benchmark, design research, perf audit, and current UX-gallery screenshots.
5. Reuse the existing design system tokens/components for spacing, typography, color, radius, elevation, focus, and motion.
6. Treat WCAG 2.1 AA, keyboard/touch operability, reduced motion, and contrast as release gates.
7. Protect smooth large-trace interaction; run the perf smoke test when rendering, pan, zoom, hover, parsing, alignment, or assembly paths change.
8. Preserve editing, export, alignment, assembly, primer/Tm, permalinks, and multi-trace behavior in every PR.
9. Update the devlog, UX-gallery assessment, and validation notes for every user-visible or enablement change.
