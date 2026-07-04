# sanger-viewer

Browser-native Sanger trace viewer for `.ab1` and `.scf` files — zero install, 100% client-side/private, and faster to open for quick inspection than desktop-first tools such as SnapGene Viewer, FinchTV, or Chromas.

**Live demo:** https://animeshkundu.github.io/sanger-viewer/

![Animated walkthrough showing open → rendered trace → share permalink → analyze flow](docs/hero-open-render-share-analyze.gif)

sanger-viewer is a private-by-default, browser-native Sanger workbench: open a trace instantly (including auto-loaded sample first impression), inspect and edit with confidence, share exact view state via client-side permalink hashes, and run reference alignment, variant review, contig assembly, and primer/in-silico PCR analysis — all in-browser, with trace data staying on your machine.

## Why use it

- Open `.ab1` and `.scf` traces directly in the browser with drag-and-drop, file picker, or the built-in sample trace
- Inspect rendered chromatograms with quality shading, base labels, zoom/pan, tooltip hover, and a synced sequence panel
- Keep trace data private: parsing, rendering, and export stay client-side in the browser
- Use power features already shipping in the app today, including undo/redo edits, Q-trim, mixed-base calling, annotations, base inspection, multi-trace consensus, and PNG/SVG/FASTA export

## Supported formats

- `.ab1` ABIF traces
- `.scf` Standard Chromatogram Format traces

## Development

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run perf:smoke
npm run build
```

## GitHub Pages

The app is configured with project base path `/sanger-viewer/` for production builds and deployed by `.github/workflows/deploy-pages.yml` on pushes to `main`.
A static devlog is published at `/sanger-viewer/blog/`.

## Fixtures

Fixture files are in `fixtures/` with provenance in `fixtures/PROVENANCE.md`.
