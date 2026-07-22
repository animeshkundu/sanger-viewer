# Signal studio design system

The viewer uses an instrument-inspired visual system: the chromatogram is the
primary evidence surface, controls are grouped by intent, and deeper scientific
tools live in a persistent rail. The design remains dependency-free and uses
system fonts so the static app never requests third-party assets.

## Hierarchy

1. **Front door:** the empty state names accepted formats, states the local-only
   privacy boundary at the file decision point, and explains the open → inspect
   → decide workflow. Blank analysis surfaces stay hidden until a trace exists.
2. **Trace stage:** a compact live header identifies the file, format, base
   count, sample count, and A/C/G/T channel colours without covering the canvas.
3. **Primary actions:** pan, zoom, strand, edit, and export stay directly below
   the evidence surface.
4. **Tool rail:** Inspect, Map, Analyze, and Share use the ARIA tab pattern and
   progressive disclosure. The rail is sticky on wide screens and moves below
   the trace on narrow screens.

The loaded state compresses the product introduction so the chromatogram starts
above the first 720 px viewport fold. The genuine empty state keeps the larger
editorial introduction because onboarding is then the primary task.

At narrow widths the workspace stretches to the viewport instead of sizing to
the tab strip. Multiple long trace names remain horizontally scrollable inside
the workspace bar without creating page-level overflow.

## Tokens and themes

All colours, spacing, radii, motion, and typography are defined in
`src/style.css`. Light and dark themes share semantic tokens; dark mode remains
driven by `prefers-color-scheme`. `--color-surface` stays the renderer source of
truth so the canvas and DOM surfaces cannot drift.

The four channel colours remain distinct on both themes:

- A: green
- C: blue
- G: amber
- T: red

Text, border, and focus tokens must continue to meet the measured contrast
thresholds in `tests/e2e/ux-a11y.e2e.test.ts`.

## Interaction rules

- Primary touch targets are at least 44 px.
- Every interactive control keeps a visible `:focus-visible` ring.
- Reduced-motion preference disables transitions and animation.
- Trace bytes remain local; visual presentation must never introduce analytics,
  remote fonts, CDNs, or other runtime requests.
- Existing IDs, test IDs, class contracts, exact workflow copy, and ARIA
  relationships are compatibility boundaries rather than styling hooks to
  remove.

## Visual evidence

`npm run ux:gallery` captures the complete state × theme × viewport matrix.
Large-trace review additionally uses `fixtures/large/3730.ab1` and
`fixtures/large/synth-longread-5kbp.ab1` to expose density, overflow, and
rendering issues that the bundled sample may not reveal.
