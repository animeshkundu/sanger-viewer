# Research: backfill `CHANGELOG.md` and `LEARNINGS.md`

- Date: 2026-07-13
- Tracking issue: [#57](https://github.com/animeshkundu/sanger-viewer/issues/57)
- Unit: `ffa003ae-0914-40da-b4d9-4b62128b0d90`

## Scope

The implementation unit may edit only `CHANGELOG.md` and `LEARNINGS.md`. These research and
plan files are the explicitly requested planning artifacts; they are not part of the later
implementation diff.

## Current state

- `CHANGELOG.md` is only a Keep a Changelog scaffold. It has an `[Unreleased]` section and
  empty category headings, but no dated release, PR links, or `[1.0.0]` section.
- `LEARNINGS.md` is only a template plus basic repository facts. It has no recorded
  engineering or UX lessons.
- `blog/index.html` lists 34 dated devlog entries: 13 from 2026-07-03, 19 from
  2026-07-04, and 2 from 2026-07-05. The entries provide a coherent shipped-history source,
  but the public merged-PR record must remain the authority for PR numbers and merge dates.
- The devlogs explicitly identify design research as PR #19 and the performance/reliability
  audit as PR #20. Other PR associations must be verified from the public merged-PR list
  rather than inferred from `vN` labels.
- `package.json` currently says `0.1.0`. The work unit forbids changing it, while issue #57
  explicitly requires a changelog `[1.0.0]` section representing the current shipped state.

## Candidate changelog history

Use merged PR titles, merge dates, and links to establish the final boundaries. The devlog
supports this provisional date grouping:

### 2026-07-03 — foundation and core trace workflow

- Client-side AB1/SCF parsing and chromatogram foundation.
- Tablet/touch and accessibility behavior.
- Worker parsing, viewport decimation, and interaction throttling.
- Real-fixture E2E validation of rendering, interactions, and export bytes.
- Reverse complement, PHRED/Mott trimming, metadata, multi-trace workspace, mixed-base
  calling, annotations, editable bases, and quality track.

### 2026-07-04 — analysis, sharing, performance, and workspace expansion

- Base inspector, consensus/mismatch view, print export, sample-first experience.
- Privacy-safe URL-fragment permalinks that do not contain local trace bytes.
- Performance audit, fixture budgets, binary-search hit testing, visible-range drawing,
  and reduced DOM churn.
- Reference alignment/variant export, contig assembly, annotation accessibility, primer
  design/in-silico PCR, plasmid map, manual assembly controls, clone comparison, and
  workspace-shell information architecture.
- Design-system and progressive-disclosure refinements.

### 2026-07-05 — launch-facing UX hardening

- Deterministic state/theme/viewport UX gallery and review gate.
- Workspace responsive/state-persistence polish.
- First-use dropzone, loading feedback, and narrow-mobile operability.
- Post-launch feature research is documentation rather than shipped product behavior and
  should be categorized accordingly if its PR is included.

## Concrete learnings supported by devlogs

At least the following lessons are specific enough for `LEARNINGS.md`:

1. **Measure the post-parse pipeline separately.** Worker parsing was about 12–14 ms while
   first paint was about 81–90 ms, showing that derived-state construction and rendering,
   not parsing, owned most load latency
   (`blog/2026-07-04-v17-perf-reliability-audit/index.html`).
2. **Bound pointer and draw work to the visible range.** Replacing a linear nearest-base
   scan with visible-range binary search reduced 100,000 long-read lookups from 451.3 ms to
   15.9 ms; visible-range loops also avoid off-screen quality/label work
   (`blog/2026-07-04-v20-perf-hot-paths/index.html`).
3. **Test exported contents, not only UI completion.** E2E checks should inspect PNG magic
   bytes/dimensions and FASTA grammar; a successful download event or filename does not
   prove a valid export (`blog/2026-07-03-v4-e2e/index.html`).
4. **Local-file permalinks must serialize state without serializing trace data.** URL
   fragments can restore view/edit state, while local traces use an explicit reattach flow
   to preserve the no-upload privacy boundary
   (`blog/2026-07-04-v19-permalinks/index.html`).
5. **Visual review needs deterministic, genuine evidence.** Freeze theme/motion, use a
   deterministic fixture, assert a nonblank canvas before capture, and require the complete
   state × theme × viewport matrix
   (`blog/2026-07-05-v28-ux-gallery/index.html`).
6. **Feature gates should encode domain cardinality.** Pairwise contig assembly is enabled
   for exactly two traces, not “two or more”; orientation search removes unnecessary
   assumptions about read order (`blog/2026-07-04-v22-contig-assembly/index.html`).
7. **First-use copy should expose formats, interaction, and privacy immediately.** The
   launch-facing dropzone names `.ab1`/`.scf`, says where to drop, and states that nothing
   is uploaded; loading feedback names the active file
   (`blog/2026-07-05-v29-front-door-polish/index.html`).
8. **Accessibility assertions must be modality-aware.** Hover belongs to pointer projects,
   tap selection belongs to touch projects, and contrast/focus should be measured rather
   than judged from screenshots
   (`blog/2026-07-03-v4-e2e/index.html`,
   `blog/2026-07-05-v28-ux-gallery/index.html`).

## Assumptions and open notes

- `[1.0.0]` will document the current shipped state because issue #57 requires it, even
  though package metadata remains `0.1.0`; reconciling package/tag versions is outside this
  strict file scope.
- “Traceable to merged PRs” means every release bullet will carry one or more direct public
  PR links, with titles and dates checked against GitHub's merged-PR record.
- Empty Keep a Changelog categories will be omitted. Only categories supported by merged
  work will appear.
- No automated test will be added: this is a Markdown-only change and tests would violate
  the strict two-file implementation scope. GitHub rendering, link/HTTP checks, and the
  existing full CI matrix are the direct reproducible checks.
- README and community-health requirements belong to parallel work units. This unit should
  verify they are not regressed, but must not edit their files.

