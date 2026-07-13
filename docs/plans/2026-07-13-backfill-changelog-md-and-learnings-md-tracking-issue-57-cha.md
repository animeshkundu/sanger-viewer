# Plan: backfill `CHANGELOG.md` and `LEARNINGS.md`

- Date: 2026-07-13
- Tracking issue: [#57](https://github.com/animeshkundu/sanger-viewer/issues/57)
- Unit: `ffa003ae-0914-40da-b4d9-4b62128b0d90`
- Research:
  [`docs/research/2026-07-13-backfill-changelog-md-and-learnings-md-tracking-issue-57-cha.md`](../research/2026-07-13-backfill-changelog-md-and-learnings-md-tracking-issue-57-cha.md)

## Assumptions

- The issue-mandated `[1.0.0]` section is the documentation baseline for the current
  GitHub Pages product. Package/tag version reconciliation is out of scope.
- Public merged PR metadata is authoritative. Devlogs supply technical context but will not
  be used to guess PR numbers.
- The implementation diff is limited to `CHANGELOG.md` and `LEARNINGS.md`; no test file can
  be added without violating strict scope.

## Files to change

1. `CHANGELOG.md`
2. `LEARNINGS.md`

Do not modify README, application/configuration files, `.github/`, tests, or the planning
artifacts during implementation.

## Implementation steps

1. Query the repository's public merged pull requests and record each relevant PR number,
   exact title, merge date, and public URL. Cross-check the sequence against
   `blog/index.html` and individual devlogs; resolve mismatches in favor of merged PR data.
2. Define release/date boundaries from that record. Use `[1.0.0] - YYYY-MM-DD` for the
   current shipped state and retain earlier dated groups only where the merged history
   supports a meaningful boundary. Do not present devlog `vN` labels as SemVer releases
   unless a corresponding release/tag exists.
3. Replace the changelog scaffold with valid Keep a Changelog structure:
   - brief format/SemVer introduction;
   - `[Unreleased]` with no invented changes;
   - dated release sections using only applicable `Added`, `Changed`, `Fixed`, or `Security`
     categories;
   - concise user-visible bullets, each linked directly to its merged PR;
   - bottom reference links for `[Unreleased]`, `[1.0.0]`, and any verified historical
     versions.
4. Replace the learnings template with at least eight dated, concrete lessons distilled
   from the devlogs. For each lesson, state the observed evidence, the resulting engineering
   or UX rule, and links to the relevant devlog and merged PR. Cover performance
   measurement, visible-range algorithms, export validation, privacy-safe state sharing,
   deterministic visual review, domain cardinality/orientation, first-use UX, and
   modality-aware accessibility.
5. Review both Markdown files for GitHub compatibility: balanced headings/lists, valid
   relative and absolute links, no raw unsupported markup, no empty sections, no speculative
   claims, and no prohibited attribution.
6. Confirm the diff contains only `CHANGELOG.md` and `LEARNINGS.md`. Scan both files for
   secrets before committing.
7. Commit with a Conventional Commit message. Include this trailer in the first
   implementation commit:

   `unit-id: ffa003ae-0914-40da-b4d9-4b62128b0d90`

8. Run and preserve verbatim output for the full repository gate:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`
   - `npm run perf:smoke`
   - `npm run build`
9. Push through the task progress tool, then confirm the public CI `test` job is green on
   `ubuntu-latest`. Do not open a PR until explicitly requested by the implementation task.

## Acceptance verification

1. **Dated, traceable changelog:** On the public branch/PR, open `CHANGELOG.md` in GitHub.
   Confirm `[1.0.0]` has an ISO date, every historical section is dated, and every change
   bullet's PR link opens a merged PR with matching scope.
2. **Concrete learnings:** Open `LEARNINGS.md` in GitHub and count at least five substantive
   lessons (target: eight). Confirm each includes project-specific evidence and an actionable
   future rule, with a working source link.
3. **GitHub rendering:** Use GitHub's rendered-file views for both documents and verify
   headings, lists, inline code, and links render without malformed markup.
4. **Strict scope:** Inspect the implementation commit's changed-file list and confirm it
   contains exactly `CHANGELOG.md` and `LEARNINGS.md`.
5. **CI:** Open the public workflow run and verify the `test` job passed its lint,
   typecheck, Vitest, Playwright E2E, performance smoke, and build steps. Preserve the
   actual command output in the handoff/PR.
6. **Mission-wide non-regression:** From the deployed/public repository, verify the README
   hero and live-site links still return HTTP 200 and inspect the community profile/new-issue
   chooser. Report their observed status, but make no out-of-scope edits if another unit has
   not delivered them.

## Risks and mitigations

- **Devlog labels may not equal releases or PR numbers.** Use merged PR metadata and tags,
  never sequence inference.
- **`1.0.0` conflicts with package metadata.** State the issue-driven assumption and avoid
  an out-of-scope package edit.
- **A giant release section may become unreadable.** Group by Keep a Changelog category and
  combine only tightly related PRs while retaining direct traceability.
- **Historical claims may overstate shipped behavior.** Phrase bullets from merged diffs and
  corroborating devlogs, not aspirational research entries.
- **Link rot or malformed Markdown could defeat public verification.** Use stable GitHub PR
  URLs and verify the rendered public branch/PR, not only local source.
- **The Definition of Done asks for a new failing test, but strict scope forbids tests.**
  Treat rendered Markdown/link checks as the direct behavioral checkpoint and explicitly
  disclose this constraint rather than weakening scope.

## Open notes

- If GitHub has no matching `v1.0.0` tag, the changelog comparison reference should point to
  the verified commit range or omit an invalid tag comparison; the release heading itself
  remains required by issue #57.
- Include the exact unit marker on its own line in any later PR body. Put it in the branch
  name only if the controller permits renaming the task branch safely.

