# Learnings

Durable engineering and UX lessons distilled from the project's shipped
devlog. Each entry links to the evidence that produced it.

## 2026-07-21 — Share geometry between canvas paint and hit testing

- **Context:** The Phred heatmap needed to remain aligned with chromatogram
  peaks through zoom, pan, trimming, and high-DPI canvas scaling while exposing
  the exact score under the pointer.
- **Learning:** Derive painted cell bounds and pointer hit tests from one
  CSS-pixel geometry model. Scale pointer coordinates into that model instead
  of testing against backing-store pixels, which vary with device pixel ratio.
- **Apply it:** Keep canvas geometry pure and fixture-test clipping,
  reverse-display ordering, missing data, and boundary hit behavior before
  wiring browser events.
- **Evidence:** [Phred heatmap implementation history](docs/history/2026-07-21-phred-quality-heatmap.md).

## 2026-07-13 — Derived features must use the displayed sequence

- **Context:** Editable calls appeared correctly in the sequence panel and
  exports, but search still queried the immutable raw trace.
- **Learning:** A feature pipeline can look consistent while one downstream
  consumer silently reads the wrong representation. Search, annotations,
  exports, trim, and strand-dependent tools must all derive from the same
  working sequence and recompute after edit, revert, undo, redo, strand, or
  ambiguity-threshold changes.
- **Apply it:** For every new sequence transformation, test at least one
  cross-feature path with values that differ between raw and displayed data.
- **Evidence:** [v17 reliability audit](blog/2026-07-04-v17-perf-reliability-audit/)
  and [fix PR #53](https://github.com/animeshkundu/sanger-viewer/pull/53).

## 2026-07-05 — A share link must restore workspace context, not just data state

- **Context:** Early permalinks restored trace state but always reopened the
  default sidebar tab, dropping the sender's analysis context.
- **Learning:** Reproducibility includes view state: source, viewport, strand,
  tracks, selection, edits, open panels, and the active tool. New permalink
  fields should be optional with explicit defaults so older links continue to
  hydrate.
- **Apply it:** Add round-trip tests for both the new state and legacy payloads
  whenever permalink state grows.
- **Evidence:** [v19 permalinks](blog/2026-07-04-v19-permalinks/) and
  [v28 workspace polish](blog/2026-07-05-v28-workspace-polish/).

## 2026-07-05 — Put file privacy at the decision point

- **Context:** A dismissible privacy ribbon did not answer the question users
  have while choosing whether to open a sequencing file.
- **Learning:** “Nothing is uploaded” belongs beside the drop target and sample
  action, not in secondary chrome. The implementation must match the promise:
  local trace bytes stay on-device, and share links encode viewer state rather
  than local-file contents.
- **Apply it:** Keep file handling client-side and test first-run copy,
  accepted formats, loading feedback, and usable 44 px touch targets together.
- **Evidence:** [v29 front-door polish](blog/2026-07-05-v29-front-door-polish/)
  and [v19 permalinks](blog/2026-07-04-v19-permalinks/).

## 2026-07-04 — Bound rendering work by what the screen can show

- **Context:** Full sample and peak scans made zoom, pan, labels, quality glows,
  and hover work scale with trace length even when most data was off-screen.
- **Learning:** Canvas work should scale with CSS pixel width and the visible
  peak range. Min-max buckets preserve narrow extrema better than naïve
  subsampling, while binary-search bounds avoid repeated linear scans.
- **Apply it:** Keep the one-sample path at high zoom, decimate at low zoom,
  binary-search sorted peak positions, and enforce both fidelity and timing
  budgets with large fixtures.
- **Evidence:** [v3 performance hardening](blog/2026-07-03-v3-performance/) and
  [v20 hot-path hardening](blog/2026-07-04-v20-perf-hot-paths/).

## 2026-07-04 — Measure the built app before optimizing

- **Context:** A production-build audit showed worker parsing took about
  12–14 ms while first paint took about 81–90 ms; parsing was no longer the
  dominant cost.
- **Learning:** Optimize measured bottlenecks, not inherited assumptions.
  Median timings on representative and stress fixtures separated parsing,
  derived-state rebuilds, DOM churn, and canvas work and led to specific
  follow-up budgets.
- **Apply it:** Record environment, fixture, repetitions, medians, and accepted
  budgets; turn confirmed bottlenecks into regression checks rather than
  relying on “feels fast.”
- **Evidence:** [v17 performance audit](blog/2026-07-04-v17-perf-reliability-audit/)
  and [v20 measured results](blog/2026-07-04-v20-perf-hot-paths/).

## 2026-07-04 — Biological ambiguity needs explicit coordinate and scoring rules

- **Context:** ORF/restriction annotations, mixed calls, reference comparison,
  and paired-read assembly all operate across ambiguous IUPAC bases and strand
  orientations.
- **Learning:** Correctness depends on declaring conventions: use 0-based
  half-open internal coordinates, map reverse-strand positions explicitly,
  reset ORFs at ambiguous codons, distinguish exact and IUPAC-compatible
  matches, and define quality-based tie-breaking.
- **Apply it:** Test orientation permutations, coordinate boundaries,
  ambiguous symbols, equal/missing quality, no-overlap cases, and exported
  coordinates or sequence bytes.
- **Evidence:** [v12 annotation track](blog/2026-07-03-v12-annotation-track/) and
  [v22 contig assembly](blog/2026-07-04-v22-contig-assembly/).

## 2026-07-03 — Keep one canonical edit coordinate system

- **Context:** Users can edit in either displayed strand, but edits must survive
  strand changes and feed every export and analysis feature.
- **Learning:** Store edits at forward-strand indices and map/complement only at
  the display boundary. This avoids maintaining divergent edit histories for
  forward and reverse views and makes undo/redo deterministic.
- **Apply it:** Assert the same edit through forward display, reverse
  complement, trim, mixed-base calling, FASTA, FASTQ, and QUAL. Edited bases
  need an explicit quality policy; this project uses Phred 0.
- **Evidence:** [v13 editable bases](blog/2026-07-03-v13-editable-bases/).

## 2026-07-03 — Transfer parser buffers and batch high-frequency UI updates

- **Context:** Even fast synchronous parsing delayed spinner paint, while
  pointer and wheel handlers could trigger 120 DOM writes per second.
- **Learning:** Moving parsing to a worker only protects responsiveness when
  ArrayBuffers and typed-array buffers are transferred rather than copied.
  Likewise, readouts should share the renderer's `requestAnimationFrame`
  cadence instead of tracking raw event frequency.
- **Apply it:** Transfer ownership in both worker directions, load the worker
  lazily, and allow at most one pending readout update per frame.
- **Evidence:** [v3 performance hardening](blog/2026-07-03-v3-performance/).

## 2026-07-03 — Validate scientific exports byte-for-byte

- **Context:** Edited traces introduced FASTQ and QUAL output whose sequence,
  strand, trim window, headers, wrapping, and quality encoding must agree.
- **Learning:** Format validity alone is too weak for scientific output.
  Assertions should cover exact headers, sequence bytes, separators, Phred+33
  characters, maximum scores, wrapping, trailing newlines, and edited-position
  sentinels.
- **Apply it:** Pair pure serializer tests with a browser download test that
  starts from a real user operation such as editing or strand switching.
- **Evidence:** [v13 editable bases and export tests](blog/2026-07-03-v13-editable-bases/)
  and [v22 contig FASTA tests](blog/2026-07-04-v22-contig-assembly/).
