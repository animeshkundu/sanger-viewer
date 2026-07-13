# Plan: add community-health files

- **Date:** 2026-07-13
- **Owner:** animeshkundu/sanger-viewer contributors
- **Tracking issue:** [#58](https://github.com/animeshkundu/sanger-viewer/issues/58)
- **Controller marker:** `unit-id: 8e73a17c-12b2-4f1c-85d9-2ad97c9cd434`

## Goal

Add focused GitHub community-health files that improve repository trust, make bug and feature intake reproducible, document contribution and security expectations, and preserve sanger-viewer's static, private-by-default architecture.

## Scope

Implementation will create only:

1. `.github/ISSUE_TEMPLATE/bug_report.yml`
2. `.github/ISSUE_TEMPLATE/feature_request.yml`
3. `.github/ISSUE_TEMPLATE/config.yml`
4. `CONTRIBUTING.md`
5. `CODE_OF_CONDUCT.md`
6. `SECURITY.md`

Do not edit workflows, README, application/source/test files, CHANGELOG, LEARNINGS, package metadata, or any other file. The research and plan documents are an explicit controller-requested planning-phase exception and are not part of the implementation diff.

## Assumptions

- Use Contributor Covenant version 2.1 because the repository has no existing code-of-conduct standard.
- Use GitHub's private vulnerability-reporting/security-advisory flow rather than publishing or inventing an email address. Confirm the flow is enabled before merge; if not, record that as a blocking maintainer configuration requirement.
- Metadata-only issue forms cannot gain a meaningful Vitest or Playwright regression test without violating strict scope. Validate their YAML/schema and exercise the behavior directly through GitHub's public new-issue flow instead.
- Other mission-level README, CHANGELOG, and LEARNINGS checks are verification-only for this work unit; they must not be edited.

## Implementation steps

1. **Record the baseline**
   - Capture the current response from GitHub's community-profile API, including `health_percentage` and which community files are absent.
   - Capture the current `/issues/new/choose` behavior.
   - Confirm the live site and Devlog return HTTP 200.

2. **Add the bug report issue form**
   - Create a valid GitHub Issue Forms YAML document with a clear title prefix and bug label if that label exists.
   - Require browser/version, operating system, trace format, reproducible steps, expected behavior, and actual behavior.
   - Ask for a minimal redistributable sample or redacted trace only when needed, with explicit warnings against patient, personal, confidential, credential, or sensitive sequence data.
   - Add optional redacted logs/screenshots and required acknowledgments covering reproducibility, public visibility, and safe attachments.
   - Avoid any wording that implies the application uploads trace data.

3. **Add the feature request issue form**
   - Ask for the scientific workflow/problem, desired outcome, current workaround/alternatives, and acceptance signal.
   - Ask reporters to identify privacy or data-handling implications.
   - Require confirmation that the request can preserve client-side processing, static hosting, and no trace upload/telemetry.
   - Keep proposed implementation details optional.

4. **Configure the issue-template chooser**
   - Disable blank issues so users see a consistent template chooser.
   - Add absolute contact links to:
     - `https://animeshkundu.github.io/sanger-viewer/`
     - `https://animeshkundu.github.io/sanger-viewer/blog/`
   - Keep vulnerability reporting out of public contact links and direct it through `SECURITY.md`.

5. **Add the contribution guide**
   - Document Node.js 22/npm prerequisites, `npm ci`, local development, and Playwright Chromium installation.
   - Document unit checks and the full CI-equivalent sequence: lint, typecheck, Vitest, E2E, performance smoke, and build.
   - Set expectations for narrow PR scope, Conventional Commits, direct regression tests for behavior changes, deterministic fixtures, redaction/provenance, documentation updates, static GitHub Pages base-path preservation, no runtime dependencies without justification, and no analytics or trace transmission.
   - Align PR expectations with the existing pull-request template and require human approval before merge/deploy.

6. **Add the code of conduct**
   - Adopt Contributor Covenant 2.1 verbatim where standardized.
   - Fill repository-specific enforcement/reporting language with a private, actionable maintainer channel.
   - Include the standard attribution link and enforcement guidelines.

7. **Add the security policy**
   - Define supported versions as the current deployed `main` line unless maintainers state otherwise.
   - Explain the client-side/no-server threat model, including untrusted trace parsing, browser state/export, dependency supply chain, and static Pages deployment.
   - State that the app has no intended trace upload, accounts, backend, telemetry, or analytics.
   - Provide private reporting steps through GitHub Security Advisories, requested redacted reproduction information, expected acknowledgment/coordination behavior, and guidance not to disclose publicly before a fix.
   - Explain which reports belong in the public bug form versus private security reporting.

8. **Validate locally**
   - Parse all three YAML files and validate required Issue Forms keys, unique IDs, supported field types, required validations, and valid `config.yml` contact links.
   - Review Markdown rendering, relative/absolute links, privacy language, and exact file scope.
   - Run and preserve verbatim output for:
     - `npm ci`
     - `npm run lint`
     - `npm run typecheck`
     - `npm run test`
     - `npx playwright install --with-deps chromium`
     - `npm run test:e2e`
     - `npm run perf:smoke`
     - `npm run build`
   - Scan the six implementation files for secrets.
   - Run code review and security validation before final handoff.

9. **Commit and publish the implementation**
   - Ensure the branch name contains `8e73a17c-12b2-4f1c-85d9-2ad97c9cd434` if branch renaming remains possible.
   - Use a Conventional Commit message and put `unit-id: 8e73a17c-12b2-4f1c-85d9-2ad97c9cd434` in the first implementation commit as its own trailer.
   - Keep the eventual PR body aligned with the repository template and include the same marker on its own line.
   - Do not open the PR during planning; open it only when explicitly requested in the implementation phase.

10. **Verify externally after publication**
    - Confirm each new file renders in the public repository.
    - Re-query the community-profile API and compare it with the baseline; verify `health_percentage` increased and the response identifies the new community-health files.
    - Open `/issues/new/choose` in a clean browser session and verify Bug report and Feature request cards, disabled blank issues, and both contact links.
    - Follow the live-site and Devlog links and verify HTTP 200.
    - Confirm the GitHub Actions `test` job is green on `ubuntu-latest`.
    - Verify the mission-level README hero/live link/comparison/quickstart and CHANGELOG/LEARNINGS criteria without editing those files; report any parallel-unit blocker explicitly.

## Acceptance-criterion mapping

| Criterion | Evidence |
| --- | --- |
| Community profile improves | Before/after API responses show a higher `health_percentage` and entries for the new files. |
| Template chooser is available | Clean-browser evidence from `/issues/new/choose` shows bug and feature cards, no blank issue option, and live-site/Devlog contact links. |
| Bug intake is reproducible and privacy-safe | Rendered bug form requires environment and reproduction details and warns against sensitive trace attachments. |
| Contribution path is clear | Public `CONTRIBUTING.md` renders setup, full unit/E2E/performance/build commands, and PR expectations. |
| Conduct and security paths are trustworthy | Public files render; conduct reports have an actionable private route; vulnerability reports use private GitHub advisories. |
| Static/private architecture is preserved | Content explicitly prohibits trace upload/telemetry; implementation contains only metadata/Markdown and adds no dependency or runtime code. |
| CI remains green | Verbatim local command output plus successful required `test` job on `ubuntu-latest`. |
| Mission-level checks remain intact | Public HTTP/rendering checks pass for README assets/site, CHANGELOG, and LEARNINGS; no out-of-scope edits are made. |

## Key risks and mitigations

- **Invalid issue-form schema:** Validate YAML and GitHub Issue Forms constraints before commit, then verify rendering in the actual chooser.
- **Sensitive trace disclosure:** Use repeated, prominent redaction/public-visibility warnings and accept synthetic or redistributable minimal samples.
- **Broken or misleading contact links:** Use canonical absolute Pages URLs and verify HTTP 200 externally.
- **Unavailable private reporting channel:** Treat missing GitHub private vulnerability reporting as a pre-merge configuration blocker rather than directing vulnerabilities to public issues.
- **Unknown labels:** Confirm labels before specifying them; omit unverified labels rather than creating a broken workflow or expanding scope.
- **Contributor Covenant customization drift:** Preserve standard 2.1 text and limit customization to clearly marked reporting/enforcement details.
- **Scope conflict:** Restrict implementation to the six named files; treat only the two explicitly requested planning artifacts as a planning exception.
- **False confidence from local checks:** Require public GitHub API, rendered chooser, HTTP, and Actions evidence in addition to local validation.
- **Mission-level parallel work incomplete:** Verify README, CHANGELOG, and LEARNINGS publicly but report failures without editing those out-of-scope files.

## Open notes

- The maintainer may need to enable private vulnerability reporting in repository security settings.
- The implementation phase should verify available labels before adding `labels` values to either form.
- No application test should be added solely to inspect static community metadata; direct GitHub rendering is the behavior under test.
