# 2026-07-15 — Chromatogram tooltip viewport overflow

## Summary

The chromatogram hover tooltip was clipped when the pointer approached the
right or bottom viewport edge. Tooltip placement now mirror-flips to the
pointer's opposite side and remains clamped to the viewport.

## Impact

Desktop users could lose the peak and amplitude readout at viewport edges,
including at common narrow desktop widths.

## Root cause / decision path

`showTooltip` always positioned the fixed tooltip at `clientX + 10` and
`clientY + 10`. It also positioned the element before populating its text, and
the tooltip's `display: none` hidden state prevented meaningful measurement.

Because the pointer coordinates and fixed positioning both use viewport
coordinates, the tooltip can be measured directly against `window.innerWidth`
and `window.innerHeight` without coordinate translation.

## Fix / outcome

`showTooltip` now reveals and populates the tooltip before reading its
dimensions. Each overflowing axis mirror-flips with a 10 px cursor gap, then
clamps to the viewport. Existing text and visibility behavior is unchanged.

Browser evidence uses an 800 x 720 viewport and the `310.ab1` fixture. Before
the fix, the right edge measured 867.65625 px; the Playwright regression now
requires both tooltip edges to remain within the 800 px viewport. The existing
lint, typecheck, Vitest, and production build gates cover unchanged behavior.

## Follow-ups

None.

## Links

- Regression: `tests/e2e/tooltip-viewport.e2e.test.ts`
- Implementation: `src/components/Tooltip.ts`
