# sanger-viewer

Browser-native Sanger trace viewer for `.ab1` and `.scf` files — zero install, 100% client-side/private, and faster to open than desktop-only viewers such as SnapGene Viewer, FinchTV, or Chromas.

**Live demo:** https://animeshkundu.github.io/sanger-viewer/

![Rendered chromatogram in the dark-themed sanger-viewer app, showing the quality track, colored peaks, sequence panel, and export controls after loading a sample trace.](docs/rendered-trace.png)

> The screenshot shows the current viewer after loading a sample trace. The deployed app still opens to file/sample choice today; the auto-loaded first-impression pass is being shipped separately.

## Why a first-time visitor should care

- Open `.ab1` and `.scf` traces directly in the browser with drag-and-drop or the built-in sample trace.
- Keep sequencing data private: parsing, rendering, and export stay 100% client-side.
- Review the chromatogram the way you actually work: colored peaks, base calls, quality track, zoom/pan, strand flip, and sequence search in one place.
- Stay productive when you need more than a quick look: undo/redo, Q-trim, mixed-base calling, annotations, base inspector, and multi-trace consensus are already built in.
- Export what you need without installing anything: PNG, SVG, FASTA, FASTQ, QUAL, and consensus FASTA.

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
