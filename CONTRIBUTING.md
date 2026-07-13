# Contributing to sanger-viewer

Thank you for helping make Sanger trace analysis more accessible. Keep contributions focused,
client-side, and compatible with static hosting under the `/sanger-viewer/` base path. Trace data
must never be uploaded, transmitted, logged remotely, or used for analytics.

## Development setup

Prerequisites: a current Node.js LTS release and npm.

```sh
git clone https://github.com/animeshkundu/sanger-viewer.git
cd sanger-viewer
npm ci
npx playwright install --with-deps chromium
npm run dev
```

The development server prints its local URL. Use only non-confidential traces during development.

## Tests and validation

Run unit tests:

```sh
npm run test
```

Run browser end-to-end tests:

```sh
npm run test:e2e
```

Before requesting review, run the complete local gate:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run perf:smoke
npm run build
```

Bug fixes should include a focused regression test. Features should exercise their behavior,
including relevant failure or edge cases. Do not skip tests or relax assertions to make a change
pass.

## Pull requests

1. Open or reference an issue that explains the scientific workflow or defect.
2. Keep one concern per pull request and avoid unrelated formatting or dependency changes.
3. Use a Conventional Commit prefix such as `feat:`, `fix:`, `docs:`, or `test:`.
4. Explain the user-visible behavior, privacy implications, and how the change was verified.
5. Include before/after evidence for user-interface changes.
6. Ensure CI passes and respond to review feedback. A maintainer must approve merging.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). For
vulnerabilities, follow the private process in [SECURITY.md](SECURITY.md), not a public issue.
