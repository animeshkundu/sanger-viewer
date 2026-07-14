# Supply-chain scanning configuration research

- **Date:** 2026-07-14
- **Owner:** @animeshkundu
- **Work unit:** Dependabot, CodeQL, and CODEOWNERS
- **Controller marker:** `unit-id: 09bf8751-52a7-4515-a6de-7ee3de502dc5`

## Context and scope

The mission combines SEO/deployment work with repository supply-chain controls.
This work unit is intentionally limited to:

- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- `.github/CODEOWNERS`
- focused tests for those repository contracts
- directly related documentation

It must not modify `.github/workflows/ci.yml` or
`.github/workflows/deploy-pages.yml`. It also must not add runtime code,
telemetry, third-party scripts, or backend behavior.

## Repository findings

1. Neither Dependabot configuration, a CodeQL workflow, nor CODEOWNERS currently
   exists under `.github/`.
2. The npm package root is `/`; `package.json` and `package-lock.json` are both
   at the repository root. Dependabot's npm `directory` should therefore be
   `/`.
3. GitHub Actions workflows live under `.github/workflows/`; the
   `github-actions` update directory should also be `/`.
4. The existing CI workflow runs on pull requests and non-main pushes with
   read-only contents permission. Its test job runs, in order, npm install,
   lint, typecheck, unit tests, Playwright E2E, performance smoke, and build.
   A separate UX-gallery job follows. This workflow is explicitly out of scope
   and must remain byte-for-byte unchanged.
5. The existing Pages workflow deploys `dist` from `main`, grants only
   `contents: read`, `pages: write`, and `id-token: write`, and is explicitly
   out of scope.
6. Production builds use Vite base `/sanger-viewer/`; no supply-chain file
   needs or should change that setting.
7. Existing workflows use floating action major tags. The new CodeQL workflow
   has the stricter work-unit requirement to pin every `uses:` reference to a
   full immutable commit SHA. Existing workflows should not be changed as part
   of this unit.
8. Vitest includes `tests/**/*.test.ts` and excludes `tests/e2e/**`. No YAML
   parser is installed. A focused repository-contract test can use Node's file
   APIs and precise assertions without adding a production or development
   dependency.
9. Test guidance requires deterministic, independent, focused assertions.
10. `CHANGELOG.md` has an Unreleased section. `LEARNINGS.md` is reserved for
    durable lessons; the supply-chain implementation should add a concise
    learning only if implementation or CI exposes a non-obvious constraint.

## Proposed configuration contracts

### Dependabot

Use version 2 configuration with two weekly update entries:

- `package-ecosystem: npm`, `directory: /`
- `package-ecosystem: github-actions`, `directory: /`

Give each entry an explicit weekly schedule. Use a deterministic UTC weekday
and time, staggered to avoid both ecosystems opening updates simultaneously.
No registry credentials or secrets are needed.

### CodeQL

Create one JavaScript/TypeScript analysis job that runs on:

- pushes to `main`
- pull requests targeting `main`
- a weekly UTC schedule
- optional manual dispatch for reproducible reruns

Use `ubuntu-latest`, `javascript-typescript`, checkout, CodeQL initialization,
autobuild, and CodeQL analysis. Resolve the current supported upstream action
release tags immediately before implementation and replace every action tag
with its verified 40-character commit SHA, retaining the release tag only as a
human-readable YAML comment.

Apply least privilege: default `contents: read`; grant the analysis job only
the additional permissions required to upload CodeQL results
(`security-events: write`, and `packages: read` if required by the supported
CodeQL action contract). Do not grant write access to repository contents,
pull requests, issues, checks, deployments, or id tokens.

### CODEOWNERS

Place CODEOWNERS at `.github/CODEOWNERS` and assign the repository-wide `*`
pattern to `@animeshkundu`. This standard location is discoverable by GitHub
and covers the ownership file and workflows themselves.

## Testing and evidence strategy

Add a focused Vitest repository-contract test that fails when any requested
file is absent and checks the security-sensitive invariants:

- both Dependabot ecosystems, root directories, and weekly schedules exist;
- CodeQL includes push, pull request, schedule, and JavaScript/TypeScript;
- every CodeQL `uses:` value ends in a full 40-character SHA rather than a
  mutable tag;
- effective CodeQL permissions do not exceed the documented minimum;
- CODEOWNERS assigns `*` to `@animeshkundu`;
- the pre-existing CI and deploy workflow files are not edited, verified from
  the final diff.

The static test is a regression guard, while the actual GitHub Actions run is
the behavioral proof that initialization, autobuild, analysis, and SARIF
upload work. No new YAML dependency is justified for three small fixed-format
files.

## Mission-wide acceptance baseline

The current checkout does not contain `public/og-image.png`,
`public/BUILD_SHA.txt`, `public/sitemap.xml`, `public/robots.txt`, or a favicon.
The root `index.html` contains only basic charset, viewport, and title metadata;
it has no canonical, description, Open Graph, Twitter, or JSON-LD metadata.
Therefore mission criteria 1-5 are not presently satisfied by this checkout
and are outside this work unit. They must land through the corresponding
SEO/deploy work unit before the integrated mission can be declared complete.
This unit must nevertheless rerun the public checks after merge/deploy and
report failures explicitly rather than claiming them.

## Risks and mitigations

- **Mutable or stale action references:** resolve supported release tags to
  upstream commit SHAs immediately before implementation, verify the commits
  belong to the official repositories, and enforce full-SHA syntax in tests.
- **Insufficient CodeQL upload permission:** follow the current official CodeQL
  permission contract and confirm a completed analysis result through GitHub's
  checks/actions APIs.
- **Excessive workflow privilege:** keep global permissions read-only and add
  only the analysis upload permissions at job scope.
- **Duplicate scans or unexpected cost:** use one language entry and avoid an
  unnecessary strategy matrix for this TypeScript-only repository.
- **Dependabot PR bursts:** stagger weekly schedules; do not enable broad
  grouping without an explicit maintenance decision.
- **Fork pull-request behavior:** GitHub may restrict `security-events: write`
  for untrusted forks. Treat GitHub's documented pull-request CodeQL handling
  as authoritative and validate on this repository's PR branch.
- **Unrelated deployment regression:** do not edit existing CI, Pages, Vite, or
  application files; verify their checks and final diff.
- **Mission criteria owned by sibling work:** record the current absence and
  run the exact live-site checks after integration rather than silently
  reducing scope.

## Assumptions and open notes

- The most reasonable CODEOWNERS location is `.github/CODEOWNERS`.
- Weekly means once per week in UTC; Monday is used unless repository policy
  established before implementation requires another day.
- CodeQL scans the default branch on push and PRs targeting it; PR execution
  provides branch proof before merge.
- GitHub code scanning is enabled or can be enabled for this public repository.
  If policy blocks SARIF upload, report that as an external blocker.
- The current task branch is managed by the agent environment. If branch
  renaming is available without disrupting the assigned branch, include the
  exact controller marker in it; otherwise preserve the marker in the first
  commit trailer and future PR body.

## Sources

- [`package.json`](../../package.json)
- [`vite.config.ts`](../../vite.config.ts)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/deploy-pages.yml`](../../.github/workflows/deploy-pages.yml)
- [`index.html`](../../index.html)
- [`docs/research/README.md`](README.md)
- [`docs/plans/README.md`](../plans/README.md)
- [GitHub Dependabot configuration reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)
- [GitHub CodeQL workflow configuration](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning)
- [GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

