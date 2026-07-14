# Supply-chain scanning configuration implementation plan

- **Date:** 2026-07-14
- **Owner:** @animeshkundu
- **Controller marker:** `unit-id: 09bf8751-52a7-4515-a6de-7ee3de502dc5`
- **Related research:** [Supply-chain scanning configuration research](../research/2026-07-14-supply-chain-scanning-config-add-github-dependabot-yml-npm-g.md)

## Scope and assumptions

Implement only Dependabot, CodeQL, CODEOWNERS, focused regression tests, and
directly related documentation. Do not edit `.github/workflows/ci.yml`,
`.github/workflows/deploy-pages.yml`, Vite configuration, application code, or
public-site assets.

Assume `.github/CODEOWNERS` is the canonical ownership location, Monday UTC is
an acceptable weekly cadence, and the public repository permits CodeQL result
upload. Mission-wide SEO and live build-SHA criteria are owned by other work
units; verify them after integrated deploy, but do not broaden this unit to
implement them.

## Files to add or update

1. Add `.github/dependabot.yml`.
2. Add `.github/workflows/codeql.yml`.
3. Add `.github/CODEOWNERS`.
4. Add `tests/repository/supply-chain-config.test.ts`.
5. Update `CHANGELOG.md` under Unreleased to record the repository security
   controls.
6. Update `LEARNINGS.md` only if implementation or live CI reveals a durable,
   non-obvious constraint worth preserving.
7. Preserve these research and plan artifacts as implementation context.

## Step-by-step implementation

1. **Capture the pre-change baseline.**
   - Record `git status`, the current branch, and hashes of `ci.yml` and
     `deploy-pages.yml`.
   - Run `npm ci`.
   - Run the existing full validation suite before implementation:
     `npm run lint`, `npm run typecheck`, `npm run test`,
     `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Preserve actual command output and identify pre-existing failures without
     weakening checks.

2. **Resolve immutable GitHub Action revisions.**
   - Identify current supported releases of `actions/checkout` and
     `github/codeql-action`.
   - Resolve each release tag through GitHub's API to its underlying commit,
     including annotated-tag dereferencing where applicable.
   - Confirm the commit belongs to the official repository and record the full
     40-character SHA with a nearby release-tag comment.
   - Run the GitHub advisory check before introducing any action references and
     incorporate any findings.

3. **Add Dependabot configuration.**
   - Use schema version 2.
   - Configure root npm and root GitHub Actions ecosystems for weekly updates.
   - Use explicit, staggered UTC schedules and no credentials.

4. **Add the CodeQL workflow.**
   - Trigger analysis on pushes to `main`, PRs targeting `main`, weekly
     schedule, and manual dispatch.
   - Analyze only `javascript-typescript` on `ubuntu-latest`.
   - Pin checkout and all CodeQL action steps to verified immutable SHAs.
   - Use a read-only global permission baseline and only the job-level
     permissions required for package access and security-result upload.
   - Keep setup minimal: checkout, initialize, autobuild, and analyze.

5. **Add repository ownership.**
   - Add `.github/CODEOWNERS` with `* @animeshkundu`.
   - Confirm GitHub recognizes the file and owner after push.

6. **Add regression coverage before declaring the configuration complete.**
   - Add a deterministic Vitest contract test that fails if any requested file
     is absent.
   - Assert both Dependabot ecosystems, root directories, and weekly cadence.
   - Assert all required CodeQL events and JavaScript/TypeScript analysis.
   - Assert no CodeQL `uses:` reference is mutable or shorter than 40
     hexadecimal characters.
   - Assert CodeQL permissions are limited to the intended read/upload set and
     that CODEOWNERS has the repository-wide assignment.
   - Include negative/security assertions, not only presence checks.
   - Do not add a YAML parsing dependency unless the text contract proves
     incapable of guarding the configuration.

7. **Update directly related documentation.**
   - Add an Unreleased changelog entry for automated dependency updates,
     CodeQL, and ownership.
   - Add a LEARNINGS entry only if a reusable lesson emerges.
   - Keep the implementation aligned with this plan or document any necessary
     deviation.

8. **Validate locally and inspect the final diff.**
   - Run `npm run lint && npm run typecheck && npm run test`.
   - Run `npm run test:e2e`, `npm run perf:smoke`, and `npm run build`.
   - Paste actual verbatim output in the implementation handoff/PR evidence.
   - Confirm the Vite output still uses `/sanger-viewer/`.
   - Confirm `ci.yml` and `deploy-pages.yml` hashes match the baseline.
   - Scan every changed file for secrets.
   - Run code review and CodeQL validation; address valid findings and rerun
     validation after significant fixes.

9. **Commit and publish implementation evidence.**
   - Use a Conventional Commit.
   - Include the exact controller marker as a trailer in the first
     implementation commit if it was not already included in the branch's
     first commit.
   - Include the marker on its own line in the PR body.
   - If branch renaming is safely supported, include the exact marker in the
     branch name; otherwise note the environment limitation.
   - Record commands, results, assumptions, risks, and intentionally deferred
     mission work in the PR.

10. **Verify GitHub behavior on the PR branch.**
    - Use GitHub Actions/check APIs to confirm the CodeQL workflow was triggered
      by the PR and completed successfully.
    - Confirm the initialize, autobuild, and analyze steps ran and that code
      scanning reports analysis for the PR head SHA.
    - Confirm all existing CI jobs, including E2E, performance smoke, build,
      and UX gallery, remain green.
    - Confirm GitHub exposes the expected CODEOWNERS file and Dependabot
      configuration from the PR head.

11. **Verify after merge and deploy.**
    - Wait for the `main` CodeQL push run and existing Pages deploy to finish.
    - Confirm the CodeQL analysis is attached to the merged main SHA.
    - Run every mission-wide live-site check below against the deployed main
      SHA. Report any sibling-work blocker explicitly.

## Acceptance-criterion verification matrix

1. **Open Graph image:** after deploy, run
   `curl -fSsI https://animesh.kundus.in/sanger-viewer/og-image.png`, download
   it with `curl -fsSL`, and inspect dimensions as 1200×630 with an image
   metadata tool. This unit does not create the image; absence remains a
   mission blocker.
2. **Build SHA:** obtain main with `git rev-parse HEAD`, request
   `BUILD_SHA.txt` with a random cache-busting query, compare exact trimmed
   bytes, and associate the successful Pages run with that SHA through the
   Actions API. This unit does not modify deployment stamping.
3. **Source metadata:** fetch the root HTML with `curl -fsSL` and inspect raw
   view-source, not the hydrated DOM. Assert one self-canonical URL, one meta
   description, all required Open Graph fields, absolute image URL, Twitter
   `summary_large_image`, and valid SoftwareApplication JSON-LD.
4. **Crawl files:** fetch `sitemap.xml` and `robots.txt` with `curl -fsSL`;
   validate XML parsing, canonical URLs, and the absolute `Sitemap:` line.
5. **Lighthouse:** run Lighthouse against the deployed URL with the SEO
   category enabled, preserve the report as PR evidence, and assert score
   `>= 0.90`. Do not introduce analytics or external scripts to achieve it.
6. **Supply-chain controls:** retrieve the three files from the PR head and
   merged main with repository-content APIs; inspect the CodeQL workflow run
   and job logs through Actions APIs; query code-scanning analysis for the
   expected commit; confirm Dependabot has npm and Actions weekly entries and
   CODEOWNERS assigns `@animeshkundu`.
7. **No regressions:** require all existing CI checks to pass; compare protected
   workflow hashes to baseline; run the full local suite; inspect built URLs
   for `/sanger-viewer/`; and confirm the unchanged Deploy Pages workflow
   completes for merged main.

## Key risks and stop conditions

- Stop and report if official action tags cannot be resolved to verified
  immutable commits.
- Stop and report if repository policy prevents CodeQL analysis upload; do not
  broaden permissions speculatively.
- Stop and report any baseline or post-change validation failure with verbatim
  output; do not skip, retry away, or relax the failing check.
- Stop and report if `ci.yml` or `deploy-pages.yml` changes unexpectedly.
- Report mission criteria 1-5 as blocked until their sibling implementation is
  merged; do not claim this work unit alone satisfies them.

## Completion evidence

The implementation is complete only when the requested files and regression
test are committed, local output is recorded, the CodeQL PR analysis exists,
all current CI jobs are green, changed files pass secret and security review,
and every mission criterion is either reproducibly verified after integrated
deploy or explicitly reported as blocked by work outside this unit.
