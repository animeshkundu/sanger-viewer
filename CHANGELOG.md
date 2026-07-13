# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates below are the dates the linked pull requests were merged.

## [Unreleased]

No changes yet.

## [1.0.0] - 2026-07-13

The first stable release captures the current shipped, browser-native Sanger
trace workspace.

### Added

- **2026-07-02:** Shipped the fully client-side AB1/SCF parser and interactive
  chromatogram foundation, with real fixtures, PNG/FASTA export, performance
  checks, and browser E2E coverage ([#1](https://github.com/animeshkundu/sanger-viewer/pull/1)).
- **2026-07-03:** Added the GitHub Pages deployment and public devlog
  ([#2](https://github.com/animeshkundu/sanger-viewer/pull/2)); tablet and touch
  interactions ([#3](https://github.com/animeshkundu/sanger-viewer/pull/3));
  accessible empty, loading, error, sample-load, and keyboard states
  ([#4](https://github.com/animeshkundu/sanger-viewer/pull/4)); min-max trace
  decimation, worker-based parsing, and frame-batched readouts
  ([#5](https://github.com/animeshkundu/sanger-viewer/pull/5)); and end-to-end
  fixture, viewport, interaction, and export validation
  ([#6](https://github.com/animeshkundu/sanger-viewer/pull/6)).
- **2026-07-03:** Added reverse-complement viewing
  ([#7](https://github.com/animeshkundu/sanger-viewer/pull/7)), Mott PHRED
  quality trimming ([#8](https://github.com/animeshkundu/sanger-viewer/pull/8)),
  IUPAC-aware two-strand search
  ([#9](https://github.com/animeshkundu/sanger-viewer/pull/9)), trace metadata
  and peak amplitudes ([#10](https://github.com/animeshkundu/sanger-viewer/pull/10)),
  a multi-trace workspace with SVG export
  ([#11](https://github.com/animeshkundu/sanger-viewer/pull/11)), mixed-base
  calling ([#12](https://github.com/animeshkundu/sanger-viewer/pull/12)), and
  viewport-windowed ORF and restriction-site annotations
  ([#13](https://github.com/animeshkundu/sanger-viewer/pull/13)).
- **2026-07-04:** Added editable IUPAC base calls, undo/redo, and FASTQ/QUAL
  export ([#14](https://github.com/animeshkundu/sanger-viewer/pull/14)); an exact
  per-base quality track and export guarantees
  ([#15](https://github.com/animeshkundu/sanger-viewer/pull/15)); live-site
  Playwright QA ([#16](https://github.com/animeshkundu/sanger-viewer/pull/16));
  a keyboard-accessible base inspector
  ([#17](https://github.com/animeshkundu/sanger-viewer/pull/17)); and
  multi-trace consensus and mismatch views
  ([#18](https://github.com/animeshkundu/sanger-viewer/pull/18)).
- **2026-07-04:** Added print/PDF output
  ([#21](https://github.com/animeshkundu/sanger-viewer/pull/21)), client-side
  state permalinks that never embed local trace bytes
  ([#25](https://github.com/animeshkundu/sanger-viewer/pull/25)), diverse
  performance fixtures and explicit budgets
  ([#27](https://github.com/animeshkundu/sanger-viewer/pull/27)), in-browser
  reference alignment and variant calling
  ([#30](https://github.com/animeshkundu/sanger-viewer/pull/30)), paired-read
  contig assembly ([#31](https://github.com/animeshkundu/sanger-viewer/pull/31)),
  primer design and in-silico PCR
  ([#33](https://github.com/animeshkundu/sanger-viewer/pull/33)), a trace-linked
  plasmid/linear map ([#35](https://github.com/animeshkundu/sanger-viewer/pull/35)),
  manual assembly controls
  ([#36](https://github.com/animeshkundu/sanger-viewer/pull/36)), and synchronized
  stacked clone-screen comparison
  ([#37](https://github.com/animeshkundu/sanger-viewer/pull/37)).
- **2026-07-05:** Added reduced-motion behavior, responsive workspace density,
  sticky tool tabs, and permalinked sidebar state
  ([#39](https://github.com/animeshkundu/sanger-viewer/pull/39)); an automated
  cross-theme, cross-viewport UX gallery gate
  ([#40](https://github.com/animeshkundu/sanger-viewer/pull/40)); and explicit
  private-file, loading, keyboard, and narrow-mobile front-door behavior
  ([#41](https://github.com/animeshkundu/sanger-viewer/pull/41)).

### Changed

- **2026-07-04:** Published competitor-grounded design research
  ([#19](https://github.com/animeshkundu/sanger-viewer/pull/19)), a measured
  reliability and performance audit
  ([#20](https://github.com/animeshkundu/sanger-viewer/pull/20)), browser-native
  product positioning ([#23](https://github.com/animeshkundu/sanger-viewer/pull/23)),
  implementation-ready differentiator specifications
  ([#24](https://github.com/animeshkundu/sanger-viewer/pull/24)), and an
  evidence-ranked post-1.0 roadmap
  ([#26](https://github.com/animeshkundu/sanger-viewer/pull/26)).
- **2026-07-04:** Auto-loaded the sample trace and made the canvas theme-aware
  ([#22](https://github.com/animeshkundu/sanger-viewer/pull/22)); reorganized
  the toolbar around progressive disclosure
  ([#28](https://github.com/animeshkundu/sanger-viewer/pull/28)); bounded
  hover, label, glow, and edit hot paths
  ([#29](https://github.com/animeshkundu/sanger-viewer/pull/29)); rendered
  annotations as accessible lanes
  ([#32](https://github.com/animeshkundu/sanger-viewer/pull/32)); unified the
  design system and launch copy
  ([#34](https://github.com/animeshkundu/sanger-viewer/pull/34)); and replaced
  the long panel wall with a hero trace and collapsible tabbed sidebar
  ([#38](https://github.com/animeshkundu/sanger-viewer/pull/38)).
- **2026-07-05 to 2026-07-07:** Added evidence-backed next-step research
  ([#42](https://github.com/animeshkundu/sanger-viewer/pull/42)) and repository
  contribution conventions
  ([#43](https://github.com/animeshkundu/sanger-viewer/pull/43),
  [#48](https://github.com/animeshkundu/sanger-viewer/pull/48)).
- **2026-07-13:** Reworked the repository front page into a launch conversion
  asset with a real product hero, browser-native comparison, quickstart, and
  canonical live-site link
  ([#62](https://github.com/animeshkundu/sanger-viewer/pull/62)).

### Fixed

- **2026-07-13:** Made search recompute against edited base calls after edit,
  revert, undo, and redo, so matches agree with the displayed and exported
  sequence ([#53](https://github.com/animeshkundu/sanger-viewer/pull/53)).
