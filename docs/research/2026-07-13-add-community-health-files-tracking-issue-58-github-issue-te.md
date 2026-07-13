# Community-health files research

- **Date:** 2026-07-13
- **Owner:** animeshkundu/sanger-viewer contributors
- **Tracking issue:** [#58](https://github.com/animeshkundu/sanger-viewer/issues/58)
- **Controller marker:** `unit-id: 8e73a17c-12b2-4f1c-85d9-2ad97c9cd434`

## Context

This work unit adds GitHub community-health documentation and issue forms so scientists can report reproducible problems, propose improvements, understand contribution expectations, and report vulnerabilities privately. The application must remain static, client-side only, private by default, and free of analytics or trace-data transmission.

The requested implementation scope is limited to:

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

The two planning artifacts requested by the controller are treated as an explicit planning-phase exception to that implementation scope. No implementation file is changed during planning.

## Repository findings

1. No issue-template directory or root-level `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `SECURITY.md` currently exists. GitHub therefore has none of these repository-local files to count in the community profile or present in the new-issue chooser.
2. The canonical live site is `https://animeshkundu.github.io/sanger-viewer/`, and the published Devlog is `https://animeshkundu.github.io/sanger-viewer/blog/` (`README.md:5,41-44`; `vite.config.ts:4-11`; `blog/index.html:6-20`).
3. Production uses the GitHub Pages base path `/sanger-viewer/` while the local Vite server uses `/` (`vite.config.ts:4-5`). Community links must use absolute public URLs so they work from GitHub.
4. The project uses Node.js 22 in CI and npm (`.github/workflows/ci.yml:13-25`). The full `test` job runs `npm ci`, lint, typecheck, Vitest, Chromium installation, Playwright E2E, the performance smoke test, and the production build (`.github/workflows/ci.yml:25-32`).
5. Available npm commands are `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run perf:smoke`, and `npm run build` (`package.json:6-16`).
6. The repository is MIT licensed (`LICENSE:1-21`). Contributor Covenant text and links must remain compatible with repository distribution.
7. Existing project rules require a fully client-side application, no trace upload or transmission, no telemetry, preservation of the GitHub Pages base path, focused PRs, Conventional Commit prefixes, and green CI.
8. The repository PR template asks contributors to report all validation commands and includes UX-gallery expectations (`.github/pull_request_template.md:34-44`). `CONTRIBUTING.md` should align with it rather than define a conflicting process.
9. Issue forms are static YAML metadata. Their meaningful regression checks are schema validation, GitHub rendering, chooser behavior, and link reachability; adding application tests would violate the strict file scope and would not exercise GitHub's issue-form renderer.

## Recommended content

### Bug report form

- Use GitHub Issue Forms (`name`, `description`, `title`, `labels`, `body`) with required fields for browser/version, operating system, steps to reproduce, expected result, and actual result.
- Ask for either a redistributable sample trace or a minimal redacted trace when the file is necessary to reproduce the problem.
- Explicitly warn reporters not to attach patient identifiers, personal data, confidential sequences, credentials, or otherwise sensitive trace data.
- Include optional fields for trace format, console output, and screenshots, each with redaction guidance.
- Require checkboxes confirming that the report is reproducible and attachments are safe to publish.

### Feature request form

- Ask for the scientist's workflow/problem, desired outcome, alternatives or current workaround, and privacy implications.
- Require acknowledgment that the proposal preserves static, client-side processing and does not require uploading trace data.
- Keep implementation suggestions optional so users can report needs without prescribing architecture.

### Chooser configuration

- Disable blank issues so the chooser consistently presents the two forms.
- Add contact links for the live site and Devlog using absolute GitHub Pages URLs.
- Do not route security reports to public issues; `SECURITY.md` will direct them to GitHub's private vulnerability-reporting flow.

### Contributing guide

- Cover prerequisites (Node.js 22, npm, and Chromium for Playwright), clone/install/dev commands, repository structure relevant to contributors, and all unit/E2E/performance/build checks.
- State privacy, static-hosting, dependency, fixture-redaction, test-coverage, Conventional Commit, PR scope, documentation, and human-approval expectations.
- Explain that fixes and features need direct regression coverage, while metadata-only community-health changes are verified through schema/public-GitHub checks.

### Code of conduct

- Use the current Contributor Covenant 2.1 text, including scope, enforcement responsibilities, enforcement guidelines, attribution, and an actionable reporting route controlled by the maintainer.
- Do not invent a public email address. Use a repository-supported private contact mechanism or clearly identify that a maintainer must configure one before merge if GitHub does not expose a suitable private route.

### Security policy

- Describe the threat model: untrusted local binary trace input, browser parsing/rendering/export, URL-fragment state, static assets, and supply-chain/static-hosting risks; no backend, accounts, database, analytics, telemetry, or intended trace upload.
- Direct vulnerability reports to GitHub's private security-advisory flow and request reproduction details without real sensitive traces.
- Define supported-version policy around the deployed `main` branch and explain coordinated disclosure expectations.
- Distinguish security vulnerabilities from ordinary bugs and make clear that public issue templates are not appropriate for undisclosed vulnerabilities.

## Assumptions and open notes

- **Assumption:** GitHub private vulnerability reporting is enabled or can be enabled for the repository. Before merging, verify that the Security tab exposes “Report a vulnerability”; otherwise the maintainer must provide a private reporting address in `SECURITY.md`.
- **Assumption:** The exact Contributor Covenant 2.1 standard text is preferred because no repository-specific alternative exists.
- **Assumption:** Planning documents are the only permitted additions outside the six implementation files because the task explicitly requires these durable artifacts.
- **Note:** The controller marker should be included in the branch name if branch naming is still mutable, on its own line in the eventual PR body, and as a trailer in the first implementation commit. The planning commit should not be represented as implementation completion.
- **Note:** Repository-wide README, CHANGELOG, and LEARNINGS acceptance criteria belong to parallel work units and must only be externally checked here; strict scope prohibits modifying them.

## External verification targets

1. Query `GET /repos/animeshkundu/sanger-viewer/community/profile` before and after merge, recording the prior and new `health_percentage` plus the returned file entries for `code_of_conduct`, `contributing`, `issue_template`, and `security`.
2. Open `https://github.com/animeshkundu/sanger-viewer/issues/new/choose` while signed out or in a clean browser session and verify that Bug report and Feature request cards appear, blank issues are unavailable, and both live-site/Devlog contact links are shown.
3. Open every new file on the public repository and verify GitHub renders it successfully.
4. Follow the live-site and Devlog links and verify HTTP 200 responses.
5. Run the exact CI `test` job sequence locally and confirm the required GitHub Actions `test` job is green on `ubuntu-latest`.

## Follow-up

Implement the scoped files according to the companion plan:
`docs/plans/2026-07-13-add-community-health-files-tracking-issue-58-github-issue-te.md`.
